// authentication.ts
import { mongoClient } from "./index";
import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export async function signup(req: Request, res: Response): Promise<void> {
  try {
    // Validate content-type
    if (!req.is('application/json')) {
      res.status(415).json({ error: 'Content-Type must be application/json' });
      return;
    }

    const { name, email, password, confirmpassword } = req.body;

    // Validate inputs
    if (!name || !email || !password || !confirmpassword) {
      res.status(400).json({ error: "All fields are required" });
      return;
    }

    if (password !== confirmpassword) {
      res.status(400).json({ error: "Passwords do not match" });
      return;
    }

    const db = mongoClient.db("orchestrator_ai");
    const usersCollection = db.collection("users");

    // Check if user already exists
    const existingUser = await usersCollection.findOne({ email });
    if (existingUser) {
      res.status(400).json({ error: "User already exists" });
      return;
    }

    // Hash the password before storing
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = {
      name,
      email,
      password: hashedPassword,
      createdAt: new Date(),
    };

    const result = await usersCollection.insertOne(newUser);

    res.status(201).json({
      message: "User registered successfully",
      user: { id: result.insertedId, name, email },
    });
  } catch (err) {
    console.error("Signup error:", err);
    if (err instanceof SyntaxError) {
      res.status(400).json({ error: "Invalid JSON in request body" });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
}
export async function signin(req: Request, res: Response): Promise<void> {
  try {
    // Validate content-type
    if (!req.is('application/json')) {
      res.status(415).json({ error: 'Content-Type must be application/json' });
      return;
    }

    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const db = mongoClient.db("orchestrator_ai");
    const usersCollection = db.collection("users");

    // Check if user exists
    const user = await usersCollection.findOne({ email });
    if (!user) {
      res.status(400).json({ error: "Invalid email or password" });
      return;
    }

    // Compare password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(400).json({ error: "Invalid email or password" });
      return;
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET || "defaultsecret",
      { expiresIn: "1h" } // token valid for 1 hour
    );

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    console.error("Signin error:", err);
    if (err instanceof SyntaxError) {
      res.status(400).json({ error: "Invalid JSON in request body" });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
  
}