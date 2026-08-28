import { sequelize } from "../db_connect.js";
import { DataTypes, Sequelize } from "sequelize";

const SiteEvidence = sequelize.define("SiteEvidence", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    milestoneId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: "Milestones",
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
    photoUrl: {
        type: DataTypes.STRING,
        allowNull: false
    },
    capturedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
    },
    gpsLatitude: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    gpsLongitude: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    gpsAvailable: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    }
});

export default SiteEvidence;
