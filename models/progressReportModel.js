import { sequelize } from "../db_connect.js";
import { DataTypes } from "sequelize";

const ProgressReport = sequelize.define("ProgressReport", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    projectId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: "Projects",
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
    milestoneId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: "Milestones",
            key: "id"
        },
        onDelete: "SET NULL"
    },
    summary: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    workCompleted: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    workInProgress: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    workRemaining: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    observations: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    issues: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    recommendations: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    progressPercentage: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
            min: 0,
            max: 100
        }
    },
    pdfUrl: {
        type: DataTypes.STRING,
        allowNull: true
    },
    generatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
});

export default ProgressReport;
