import { Sequelize } from "../db.connect";
import { DataTypes } from "sequelize";

const User = Sequelize.define("User", {
    id:{
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    fullName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,  
        unique:true 
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    confirmPassword: {
        type: DataTypes.STRING,
        allowNull: false
    },
    role: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "property_owner"
    }
});
