const express = require("express");
const rateLimiter = require ("./rateLimit")
const app=express();

app.use(rateLimiter.rateLimiter)

app.get("/ping",async (req,res)=>{
    res.status(200).send("pong")
})

app.listen(7001,()=>{
    console.log("server started t port 7001")
})