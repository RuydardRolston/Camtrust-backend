import supertest from 'supertest';
import {app} from '../server.js';
import {expect} from 'chai';
import { connectDB, syncDB } from '../db_connect.js';
import '../models/index.js';

before(async () => {
  await connectDB();
  await syncDB();
});

// Site Evidence Upload API test
//describe("Site Evidence Upload Tests", () => {
//  let token = "YOUR_PROFESSIONAL_AUTH_TOKEN"; // Replace with your JWT or login token
//  let validMilestoneId = 1;                   // Replace with an existing milestone ID in your DB
//
//  it("should successfully upload site evidence photo for a milestone", async () => {
//    const response = await supertest(app)
//      .post("/api/evidence/upload") // Adjust to match your exact route endpoint
//      .set("Authorization", `Bearer ${token}`)
//      .field("milestoneId", validMilestoneId)
//      .field("description", "Foundation footing rebar inspection")
//      .field("gpsLatitude", "3.8480")
//      .field("gpsLongitude", "11.5021")
//      .field("gpsAvailable", "true")
//      .attach("photo", Buffer.from("fake photo content"), "site_progress.jpg");
//
//    console.log("Upload Evidence response:", response.body);
//    expect(response.status).to.equal(201);
//    expect(response.body.success).to.equal(true);
//    expect(response.body).to.have.property("evidence");
//    expect(response.body.evidence).to.have.property("photoUrl");
//    expect(response.body.evidence.milestoneId).to.equal(validMilestoneId);
//  });
//
//  it("should fail when milestoneId is missing", async () => {
//    const response = await supertest(app)
//      .post("/api/evidence/upload")
//      .set("Authorization", `Bearer ${token}`)
//      .attach("photo", Buffer.from("fake photo content"), "site_progress.jpg");
//
//    expect(response.status).to.equal(400);
//    expect(response.body.success).to.equal(false);
//    expect(response.body.message).to.equal("Milestone ID is required");
//  });
//
//  it("should fail when photo file is missing", async () => {
//    const response = await supertest(app)
//      .post("/api/evidence/upload")
//      .set("Authorization", `Bearer ${token}`)
//      .field("milestoneId", validMilestoneId);
//
//    expect(response.status).to.equal(400);
//    expect(response.body.success).to.equal(false);
//    expect(response.body.message).to.equal("Photo file is required");
//  });
//});


//Project Creation API test
//describe("2. Project Creation", () => {
//  let ownerToken = '';
//
//  before(async () => {
//    // 1. Create and log in a Project Owner to get authentication token
//    const ownerCredentials = {
//      fullName: "CamTrust Project Owner",
//      email: `owner.${Date.now()}@gmail.com`,
//      password: "owner1234",
//      confirmPassword: "owner1234",
//      role: "owner"
//    };
//
//    await supertest(app)
//      .post("/api/users/signup")
//      .send(ownerCredentials);
//
//    const loginRes = await supertest(app)
//      .post("/api/users/login")
//      .send({
//        email: ownerCredentials.email,
//        password: ownerCredentials.password
//      });
//
//    ownerToken = loginRes.body.token;
//  });
//
//  it("should create a new construction project", async () => {
//    const response = await supertest(app)
//      .post("/api/projects")
//      .set("Authorization", `Bearer ${ownerToken}`)
//      .send({
//        title: "Residential Villa Construction",
//        location: "Yaoundé, Bastos",
//        description: "Duplex residential building remote monitoring",
//        estimatedBudget: 45000000
//      });
//
//    console.log("Project Creation response:", response.body);
//    expect(response.status).to.equal(201);
//    expect(response.body.success).to.equal(true);
//    expect(response.body.data).to.have.property("id");
//  });
//});


//LOGIN API TEST
//describe("Authentication tests", () => {
//    it("should log in an existing user", async () => {
//        const response = await supertest(app)
//        .post("/api/users/login")
//        .send({
//            email: "arianne.dutrielle@gmail.com",
//            password: "arianne1234"
//        });
//        console.log("Login response:", response.body);
//        expect(response.status).to.equal(200);
//        expect(response.body.success).to.equal(true);
//    });
//});

//Authentication API test
//describe("Authentication tests", () => {
//    it("should sign up a new user",async ()=>{
//        const response=await supertest(app)
//        .post("/api/users/signup")
//        .send({
//            fullName:"Arianne Dutrielle",
//            email:`arianne.dutrielle.${Date.now()}@gmail.com`,
//            password:"arianne1234",
//            confirmPassword:"arianne1234",
//            role:"professional"
//        });
//        console.log("Signup response:",response.body);
//        expect(response.status).to.equal(201);
//      expect(response.body.success).to.equal(true);
//   });
//});