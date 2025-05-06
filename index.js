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
        url: 'http://localhost:3000/api' // đường dẫn gốc
      }
    ]
  },
  apis: ['./routes/*.js'], // 👈 đọc toàn bộ file trong thư mục routes/
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Import router
const menuRouter = require('./routes/menu');
const usersRouter = require('./routes/users');
const contentsRouter = require('./routes/contents');
const newsRouter = require('./routes/news');
const categoriesRouter = require('./routes/categories');

// Sử dụng router với prefix /api
app.use('/api/menu', menuRouter);
app.use('/api/users', usersRouter);
app.use('/api/contents', contentsRouter);
app.use('/api/news', newsRouter);
app.use('/api/categories', categoriesRouter);

const PORT = 3600;
app.listen(PORT, () => {
  console.log(`🚀 Server chạy tại http://localhost:${PORT}`);
  console.log(`📘 Swagger docs tại http://localhost:${PORT}/api-docs`);
});
