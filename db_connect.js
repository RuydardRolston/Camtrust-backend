import { Sequelize } from 'sequelize';

export const sequelize = new Sequelize('group2', 'root', "", {
    host: 'localhost',
    dialect: 'mysql',
    logging: false,
});

export const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connected successfully');
    } catch (error) {
        console.error('Unable to connect to the database:', error);
        throw error;
    }
};

export const syncDB = async () => {
    await sequelize.sync({ force: false, alter: true });
    console.log('Database synced');
};
