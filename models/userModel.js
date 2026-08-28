import { sequelize } from "../db_connect.js";
import { DataTypes } from "sequelize";

const User = sequelize.define("User", {
    id: {
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
        unique: true,
        validate: {
            isEmail: true
        }
    },
    phone: {
        type: DataTypes.STRING,
        allowNull: true
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    role: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "property_owner",
        validate: {
            isIn: [["property_owner", "professional", "administrator"]]
        }
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "active",
        validate: {
            isIn: [["active", "inactive"]]
        }
    },
    address: {
        type: DataTypes.STRING,
        allowNull: true
    },
    specialty: {
        type: DataTypes.STRING,
        allowNull: true
    },
    verified: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    employeeId: {
        type: DataTypes.STRING,
        allowNull: true
    }
});

export default User;
