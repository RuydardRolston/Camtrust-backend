import { sequelize } from "../db_connect.js";
import { DataTypes } from "sequelize";

const Verification = sequelize.define("Verification", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    administratorId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: "Users",
            key: "id"
        },
        onDelete: "SET NULL"
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
            isIn: [["Pending", "Under Review", "Approved", "Rejected", "Action Required"]]
        }
    },
    aiAnalysis: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    date: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    reviewedAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    }
});

export default Verification;
