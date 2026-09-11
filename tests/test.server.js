import supertest from 'supertest';
import {app} from '../server.js';
import {expect} from 'chai';
import { connectDB, syncDB } from '../db_connect.js';
import '../models/index.js';

before(async () => {
  await connectDB();
  await syncDB();
});

describe("Authentication tests", () => {
    it("should sign up a new user",async ()=>{
        const response=await supertest(app)
        .post("/api/users/signup")
        .send({
            fullName:"Mary Doe",
            email:`mary.doe.${Date.now()}@gmail.com`,
            password:"mary1234",
            confirmPassword:"mary1234",
            role:"property_owner"
        });
        console.log("Signup response:",response.body);
        expect(response.status).to.equal(201);
        expect(response.body.success).to.equal(true);
    });
});