import { sequelize } from "../db_connect.js";
import { DataTypes, Sequelize } from "sequelize";

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
    summary: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    generatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
    }
});

export default ProgressReport;
