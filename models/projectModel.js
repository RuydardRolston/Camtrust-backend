import { sequelize } from "../db_connect.js";
import { DataTypes } from "sequelize";

const Project = sequelize.define("Project", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    ownerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: "Users",
            key: "id"
        },
        onDelete: "CASCADE"
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    location: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    budget: {
        type: DataTypes.STRING,
        allowNull: true
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "Under Review",
        validate: {
            isIn: [["Under Review", "Approved", "Rejected", "In Progress", "Completed"]]
        }
    },
    startDate: {
        type: DataTypes.DATE,
        allowNull: true
    },
    rejectionReason: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    estimatedDuration: {
        type: DataTypes.STRING,
        allowNull: true
    },
    estimatedEndDate: {
        type: DataTypes.DATE,
        allowNull: true
    }
});

export default Project;
