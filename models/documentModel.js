import { sequelize } from "../db_connect.js";
import { DataTypes } from "sequelize";

const Document = sequelize.define("Document", {
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
    uploadedByUserId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: "Users",
            key: "id"
        },
        onDelete: "CASCADE"
    },
    fileName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    fileUrl: {
        type: DataTypes.STRING,
        allowNull: false
    },
    category: {
        type: DataTypes.STRING,
        allowNull: false
    },
    targetRecipient: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "all",
        comment: "property_owner | administrator | both | all"
    },
    recipientUserId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: "Users",
            key: "id"
        },
        onDelete: "SET NULL"
    },
    recipientName: {
        type: DataTypes.STRING,
        allowNull: true
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "sent"
    },
    uploadedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
});

export default Document;
