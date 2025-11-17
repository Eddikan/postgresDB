'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('media', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      url: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'Full S3 URL to the media file'
      },
      type: {
        type: Sequelize.ENUM('DRILL_HOLE', 'PROJECT', 'SAMPLE', 'REPORT'),
        allowNull: false,
        defaultValue: 'DRILL_HOLE',
        comment: 'Type/category of media'
      },
      filename: {
        type: Sequelize.STRING(500),
        allowNull: false,
        comment: 'Original filename'
      },
      mimetype: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'MIME type of the file'
      },
      size: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'File size in bytes'
      },
      s3Key: {
        type: Sequelize.STRING(500),
        allowNull: false,
        unique: true,
        comment: 'S3 object key for deletion'
      },
      uploadedBy: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        comment: 'User who uploaded the media'
      },
      organisationId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'organisations',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        comment: 'Organisation that owns the media'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Add indexes for common queries
    await queryInterface.addIndex('media', ['uploadedBy']);
    await queryInterface.addIndex('media', ['organisationId']);
    await queryInterface.addIndex('media', ['type']);
    await queryInterface.addIndex('media', ['s3Key'], { unique: true });
    await queryInterface.addIndex('media', ['createdAt']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('media');
    // Drop the enum type
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_media_type";');
  }
};
