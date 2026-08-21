import {Sequelize} from 'sequelize';

export const sequelize = new Sequelize('group2', 'root', "", {
    host: 'localhost',
    dialect: 'mysql'
});

export const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connected sucessfully');
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
};