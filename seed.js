import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sequelize } from './db_connect.js';
import './models/index.js';
import User from './models/userModel.js';
import Project from './models/projectModel.js';
import Milestone from './models/milestoneModel.js';
import Verification from './models/verificationModel.js';

async function seed() {
  try {
    await sequelize.sync({ force: true });
    console.log('Database synced (force reset)');

    const salt = await bcrypt.genSalt(10);

    const owner = await User.create({
      fullName: 'John Doe',
      email: 'owner@camtrust.com',
      password: await bcrypt.hash('owner123', salt),
      role: 'property_owner',
      status: 'active',
      address: '123 Main St, Nairobi',
    });

    const professional = await User.create({
      fullName: 'Eng. Mark Tala',
      email: 'engineer@camtrust.com',
      password: await bcrypt.hash('engineer123', salt),
      role: 'professional',
      status: 'active',
      specialty: 'Civil Engineering',
      verified: true,
    });

    const admin = await User.create({
      fullName: 'Admin User',
      email: 'admin@camtrust.com',
      password: await bcrypt.hash('admin123', salt),
      role: 'administrator',
      status: 'active',
      employeeId: 'EMP-001',
    });

    const project = await Project.create({
      ownerId: owner.id,
      title: 'Modern Villa Construction',
      location: 'Nairobi, Kenya',
      description: 'A modern 4-bedroom villa with swimming pool and garden.',
      budget: '250000',
      status: 'Approved',
      startDate: '2025-01-15',
    });

    await Milestone.create({
      projectId: project.id,
      label: 'Foundation',
      plannedDate: '2025-02-01',
      completionRate: 100,
      status: 'Completed',
    });

    await Milestone.create({
      projectId: project.id,
      label: 'Superstructure',
      plannedDate: '2025-04-01',
      completionRate: 45,
      status: 'In Progress',
    });

    await Verification.create({
      administratorId: admin.id,
      professionalId: professional.id,
      status: 'Approved',
      notes: 'Verified by admin',
    });

    console.log('Database seeded successfully!');
    console.log('Demo accounts:');
    console.log('  Owner:       owner@camtrust.com / owner123');
    console.log('  Engineer:    engineer@camtrust.com / engineer123');
    console.log('  Admin:       admin@camtrust.com / admin123');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seed();
