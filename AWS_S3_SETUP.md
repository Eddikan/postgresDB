# AWS S3 Configuration Guide

## Environment Variables

Add these variables to your `.env` file:

```env
# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
APP_AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=drilling-management-photos
```

## AWS S3 Setup Steps

### 1. Create AWS Account and IAM User

1. Go to [AWS Console](https://aws.amazon.com/console/)
2. Create an IAM user with programmatic access
3. Attach the following IAM policy to the user:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::drilling-management-photos",
                "arn:aws:s3:::drilling-management-photos/*"
            ]
        }
    ]
}
```

### 2. Create S3 Bucket

1. Go to S3 service in AWS Console
2. Create a new bucket named `drilling-management-photos` (or your preferred name)
3. Configure bucket settings:
   - **Block Public Access**: Keep enabled for security
   - **Versioning**: Enable if you want file versioning
   - **Server-side encryption**: Enable AES-256
   - **CORS Configuration** (for web uploads):

```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "POST", "PUT", "DELETE"],
        "AllowedOrigins": ["*"],
        "ExposeHeaders": ["ETag"]
    }
]
```

### 3. Alternative: Use LocalStack for Development

For local development, you can use LocalStack to simulate S3:

```bash
# Install LocalStack
pip install localstack

# Start LocalStack with S3
localstack start -d

# Set environment variables for LocalStack
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
APP_AWS_REGION=us-east-1
AWS_ENDPOINT_URL=http://localhost:4566
AWS_S3_BUCKET_NAME=drilling-management-photos
```

## Security Best Practices

1. **Never commit AWS credentials to version control**
2. **Use IAM roles instead of access keys when running on AWS**
3. **Enable CloudTrail for audit logging**
4. **Set up bucket policies for additional security**
5. **Use presigned URLs for temporary access**

## Bucket Structure

The service will organize files as follows:
```
drilling-management-photos/
├── drill-holes/
│   ├── project-uuid-1/
│   │   ├── photo-uuid-1.jpg
│   │   └── photo-uuid-2.png
│   └── project-uuid-2/
│       └── photo-uuid-3.jpg
└── other-folders/
```

## Cost Optimization

1. **Use S3 Intelligent-Tiering** for automatic cost optimization
2. **Set up lifecycle policies** to move old files to cheaper storage classes
3. **Enable S3 Transfer Acceleration** if you have global users
4. **Monitor usage with AWS Cost Explorer**

## Error Handling

The S3Service includes comprehensive error handling:
- Upload failures are logged and thrown as errors
- Deletion failures are logged but don't throw (returns boolean)
- Network issues are retried automatically by AWS SDK