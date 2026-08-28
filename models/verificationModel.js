import { sequelize } from "../db_connect.js";
import { DataTypes, Sequelize } from "sequelize";

const Verification = sequelize.define("Verification", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    administratorId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: "Users",
            key: "id"
        },
        onDelete: "CASCADE"
    },
    professionalId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: "Users",
            key: "id"
        },
        onDelete: "CASCADE"
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "Pending",
        validate: {
            isIn: [["Pending", "Approved", "Rejected"]]
        }
    },
    date: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    }
});

export default Verification;
