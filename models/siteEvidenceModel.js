import { sequelize } from "../db_connect.js";
import { DataTypes } from "sequelize";

const SiteEvidence = sequelize.define("SiteEvidence", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    projectId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: "Projects",
            key: "id"
        },
        onDelete: "CASCADE"
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
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    deviceInfo: {
        type: DataTypes.STRING,
        allowNull: true
    },
    capturedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
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
    },
    gpsAccuracy: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    isMockGps: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    mockSuspicionReason: {
        type: DataTypes.STRING,
        allowNull: true
    },
    geofenceDistanceMeters: {
        type: DataTypes.FLOAT,
        allowNull: true
    }
});

export default SiteEvidence;
