import { sequelize } from "../db_connect.js";
import { DataTypes, Sequelize } from "sequelize";

const ProjectAssignment = sequelize.define("ProjectAssignment", {
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
    assignedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "proposed",
        validate: {
            isIn: [["proposed", "accepted", "rejected"]]
        }
    }
}, {
    indexes: [
        {
            unique: true,
            fields: ["projectId", "professionalId"]
        }
    ]
});

export default ProjectAssignment;
