// index.js
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const app = express();
app.use(cors());
app.use(express.json());

// Swagger cấu hình
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Nhanmacv - Joomla DB',
      version: '1.0.0',
    },
    servers: [
      {
        url: 'http://localhost:3000'
      }
    ]
  },
  apis: ['./index.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
// Import router
const menuRouter = require('./routes/menu');
const usersRouter = require('./routes/users');
const contentsRouter = require('./routes/contents');
const newsRouter = require('./routes/news');
// ... import các router khác

// Sử dụng router
app.use('/menu', menuRouter);
app.use('/users', usersRouter);
app.use('/contents', contentsRouter);
app.use('/news', newsRouter);
// ... các router khác

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server chạy tại http://localhost:${PORT}`);
  console.log(`📘 Swagger docs tại http://localhost:${PORT}/api-docs`);
});
