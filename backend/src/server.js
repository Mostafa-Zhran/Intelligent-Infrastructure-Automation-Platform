process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('dotenv').config();

const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`API docs: http://localhost:${PORT}/api-docs`);
});
