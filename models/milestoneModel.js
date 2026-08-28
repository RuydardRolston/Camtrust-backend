import { sequelize } from "../db_connect.js";
import { DataTypes } from "sequelize";

const Milestone = sequelize.define("Milestone", {
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
    label: {
        type: DataTypes.STRING,
        allowNull: false
    },
    plannedDate: {
        type: DataTypes.DATE,
        allowNull: true
    },
    completionRate: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
            min: 0,
            max: 100
        }
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "Pending",
        validate: {
            isIn: [["Pending", "In Progress", "Completed"]]
        }
    }
});

export default Milestone;
