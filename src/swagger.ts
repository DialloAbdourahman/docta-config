import swaggerJsdoc from 'swagger-jsdoc';
import { resolve } from 'path';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Docta Auth API',
      version: '1.0.0',
      description: 'Authentication service API documentation for Docta platform',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: '/api/auth/v1',
        description: 'Auth API v1',
      },
    ],
  },
  // Look for YAML files in the documentation directory
  apis: [resolve(__dirname, 'documentation', '*.yaml')],
};

export const swaggerSpec = swaggerJsdoc(options);
