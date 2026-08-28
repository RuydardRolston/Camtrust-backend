import { sequelize } from "../db_connect.js";
import { DataTypes, Sequelize } from "sequelize";

const Notification = sequelize.define("Notification", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: "Users",
            key: "id"
        },
        onDelete: "CASCADE"
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    date: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "unread",
        validate: {
            isIn: [["read", "unread"]]
        }
    }
});

export default Notification;
