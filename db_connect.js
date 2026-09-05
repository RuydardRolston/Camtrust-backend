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
    try {
        await sequelize.sync({ force: false, alter: true });
        console.log('Database synced');
    } catch (error) {
        console.warn('Database alter sync failed; retrying without schema alteration to preserve existing MySQL structure.', error.message);
        await sequelize.sync({ force: false, alter: false });
        console.log('Database synced with non-altering strategy');
    }
};
