import { sequelize } from "../db_connect.js";
import { DataTypes } from "sequelize";

const VerificationDocument = sequelize.define("VerificationDocument", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    verificationId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: "Verifications",
            key: "id"
        },
        onDelete: "CASCADE"
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
    fileName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    fileUrl: {
        type: DataTypes.STRING,
        allowNull: false
    },
    documentType: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            isIn: [["employment_attestation", "employment_certificate", "license", "certificate", "id_card", "registration", "other"]]
        }
    },
    analysis: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    uploadedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
});

export default VerificationDocument;
