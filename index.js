const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 5000;


// middleware
app.use(cors());
app.use(express.json());



app.get('/', async (req,res)=>{
    res.send('Tech-Tools is Running');
})

app.listen(port,()=>{
    console.log(`Tech-Tools is running on the port: ${port}`);
})