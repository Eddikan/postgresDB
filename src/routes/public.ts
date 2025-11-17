import { FastifyInstance } from 'fastify';
import { Country, State } from 'country-state-city';

/**
 * Public routes - no authentication required
 */
export async function publicRoutes(fastify: FastifyInstance) {
  
  /**
   * GET /countries
   * Get all countries with their states and ISO codes
   */
  fastify.get('/countries', async (request, reply) => {
    try {
      // Get all countries from the country-state-city package
      const countries = Country.getAllCountries();

      // Transform the data to match the required format
      const countriesWithStates = countries.map(country => {
        // Get states for this country
        const states = State.getStatesOfCountry(country.isoCode).map(state => ({
          name: state.name,
          isoCode: state.isoCode
        }));

        return {
          name: country.name,
          isoCode2: country.isoCode,
          isoCode3: country.isoCode, // Note: country-state-city uses ISO2, we'll use the same for ISO3
          phoneCode: country.phonecode,
          currency: country.currency,
          flag: country.flag,
          states
        };
      });

      return reply.status(200).send({
        message: 'Countries retrieved successfully',
        countries: countriesWithStates,
        total: countriesWithStates.length
      });

    } catch (error: any) {
      fastify.log.error('Error retrieving countries:', error);
      return reply.status(500).send({
        error: 'Failed to retrieve countries'
      });
    }
  });

  /**
   * GET /countries/:countryCode/states
   * Get states for a specific country
   */
  fastify.get<{
    Params: {
      countryCode: string;
    };
  }>('/countries/:countryCode/states', async (request, reply) => {
    try {
      const { countryCode } = request.params;

      // Validate country code
      if (!countryCode || countryCode.length !== 2) {
        return reply.status(400).send({
          error: 'Valid country code (ISO2) is required'
        });
      }

      // Get country information
      const country = Country.getCountryByCode(countryCode.toUpperCase());
      if (!country) {
        return reply.status(404).send({
          error: 'Country not found'
        });
      }

      // Get states for this country
      const states = State.getStatesOfCountry(countryCode.toUpperCase()).map(state => ({
        name: state.name,
        isoCode: state.isoCode,
        countryCode: state.countryCode
      }));

      return reply.status(200).send({
        message: 'States retrieved successfully',
        country: {
          name: country.name,
          isoCode2: country.isoCode,
          flag: country.flag
        },
        states,
        total: states.length
      });

    } catch (error: any) {
      fastify.log.error('Error retrieving states:', error);
      return reply.status(500).send({
        error: 'Failed to retrieve states'
      });
    }
  });

  /**
   * GET /countries/search
   * Search countries by name
   */
  fastify.get<{
    Querystring: {
      q: string;
    };
  }>('/countries/search', async (request, reply) => {
    try {
      const { q } = request.query;

      if (!q || q.trim().length === 0) {
        return reply.status(400).send({
          error: 'Search query is required'
        });
      }

      // Get all countries and filter by name
      const allCountries = Country.getAllCountries();
      const searchTerm = q.trim().toLowerCase();
      
      const matchingCountries = allCountries
        .filter(country => 
          country.name.toLowerCase().includes(searchTerm) ||
          country.isoCode.toLowerCase().includes(searchTerm)
        )
        .map(country => {
          const states = State.getStatesOfCountry(country.isoCode).map(state => ({
            name: state.name,
            isoCode: state.isoCode
          }));

          return {
            name: country.name,
            isoCode2: country.isoCode,
            isoCode3: country.isoCode,
            phoneCode: country.phonecode,
            currency: country.currency,
            flag: country.flag,
            states
          };
        });

      return reply.status(200).send({
        message: 'Search results retrieved successfully',
        query: q,
        countries: matchingCountries,
        total: matchingCountries.length
      });

    } catch (error: any) {
      fastify.log.error('Error searching countries:', error);
      return reply.status(500).send({
        error: 'Failed to search countries'
      });
    }
  });
}