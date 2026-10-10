import { sequelize } from "../db_connect.js";
import { DataTypes } from "sequelize";

const Message = sequelize.define("Message", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    senderId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: "Users",
            key: "id"
        },
        onDelete: "CASCADE"
    },
    receiverId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: "Users",
            key: "id"
        },
        onDelete: "CASCADE"
    },
    projectId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: "Projects",
            key: "id"
        },
        onDelete: "SET NULL"
    },
    body: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
            notEmpty: { msg: "Message body cannot be empty" }
        }
    },
    readAt: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null
    },
    createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: "Messages",
    updatedAt: false
});

export default Message;
