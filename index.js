const express = require('express');
const cors = require('cors');
const SSLCommerzPayment = require('sslcommerz-lts');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = process.env.PORT || 5050;

// middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const store_id = process.env.STORE_ID;
const store_pass = process.env.STORE_PASS;
const is_live = process.env.IS_SANDBOX === 'false';

// MongoDB URI
const uri = `mongodb+srv://${process.env.NAME}:${process.env.PASS}@nurealamriyal.adrs4.mongodb.net/?retryWrites=true&w=majority&appName=nurealamriyal`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});


async function run() {
  try {
    await client.connect(); 
    
    const userCollection = client.db("UnityBridgePlatform").collection("users");
    const projectCollection = client.db("UnityBridgePlatform").collection("projects");
//git push seccessfuly

    app.get('/users', async (req, res) => {
      
      // const id=req.query
      // console.log(id)
      
      // if(id){
      //    const query = { _id: new ObjectId(id) };
      //     const user=await userCollection.findOne(query)
      //     return res.json(user)
      // }
       

  const users = await userCollection.find().toArray();
      //   console.log(user)
      res.send(users);

       })
    
    app.get('/projects', async (req, res) => {
      
      const projects = await projectCollection.find().toArray();
      res.send(projects);
    });
    app.get('/projects/:id', async (req, res) => {
      try {
        const id = req.params.id;

        console.log(id);

        const query = { _id: new ObjectId(id) };
        const project = await projectCollection.findOne(query);

        res.send(project);
      } catch (error) {
        res.status(500).send({ error: error.message });
      }
    });
    // POST user
    app.post('/users', async (req, res) => {
      const user1 = req.body;
      const user = {
        name: user1.userName,
        email: user1.email,
        password: user1.password,
        image: user1.image,
        role: user1.role,
        NIDorBRITH: user1.NIDorBRITH,
        joinedDate: new Date()
      }
      console.log(user1)
      const isUserExist = await userCollection.findOne({ email: user?.email });
      if (isUserExist) {
        return res.status(400).send({ message: "User already exists" });
      }
      if (!user.email) {
        return res.status(400).send({ message: "Missing required fields" });
      }
      console.log(user)
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    //post project
    // app.post('/projects', async (req, res) => {
    //   const project = req.body;
    //   console.log(project)
    //   const result = await projectCollection.insertOne(project);
    //   res.send(result);
    // });
    app.post('/projects', async (req, res) => {
      try {
        const newProject = req.body;
        console.log("Saving New Project Configuration:", newProject);

        const result = await projectCollection.insertOne(newProject);
        res.status(201).send(result);
      } catch (error) {
        res.status(500).send({ error: error.message });
      }
    });

  

// PUT route to handle admin changing user verification status flags
app.put('/users/verify-status/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const { status } = req.body; // Expects values: 'verified', 'rejected', or 'fraud'

    if (!status) {
      return res.status(400).json({ success: false, message: "Verification status parameter field is required." });
    }

    const query = { _id: new ObjectId(userId) };
    const updateDoc = {
      $set: {
        status: status, // Update to the new status flag cleanly
        statusLastModifiedByAdmin: new Date()
      }
    };

    // Replace 'usersCollection' with your system database collection variable name
    const result = await userCollection.updateOne(query, updateDoc);

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, message: "Target user record account profile not found." });
    }

    res.status(200).json({ 
      success: true, 
      message: `User record validation status shifted cleanly to: ${status}` 
    });

  } catch (error) {
    console.error("Backend error validating application status endpoint:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});
    app.put('/projects/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const updatedProject = req.body;

        console.log("Updating Project ID:", id);
        console.log("Received Payload:", updatedProject);



        // 1. Validate the MongoDB ID format to protect the server from throwing fatal BSON errors
        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ error: 'Invalid MongoDB ID format' });
        }

        const query = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            title: updatedProject.title,
            description: updatedProject.description,
            budget: updatedProject.budget,
            timeline: updatedProject.timeline,
            volunteerCount: updatedProject.volunteerCount,
            impactMetric: updatedProject.impactMetric,
            requiredSkills: updatedProject.requiredSkills,
            status: updatedProject.status, // Safely switches between 'draft' and 'published'
            ngoEmail: updatedProject.ngoEmail,
            ngoName: updatedProject.ngoName,
            lastUpdated: updatedProject.lastUpdated || new Date().toISOString()
          },
        };
        ;
        const result = await projectCollection.updateOne(query, updateDoc, { upsert: true });
        // 3. Return the standard result directly back to TanStack Query/Axios
        res.send(result);
      } catch (error) {
        console.error("Database Update Error:", error);
        res.status(500).send({ error: error.message });
      }
    });
    app.put('/projects/volunteerrequest/:id', async (req, res) => {
  try {
    const projectId = req.params.id;
    const { volunteerDetails } = req.body;

    // 1. Basic validation to ensure the payload isn't empty
    if (!volunteerDetails || volunteerDetails.length === 0) {
      return res.status(400).json({ success: false, message: "No volunteer data provided." });
    }

    // Get the latest applicant from the end of the array
    const newApplicant = volunteerDetails[volunteerDetails.length - 1];

    // 2. Set up the MongoDB query matching your document's _id format
    // (If your DB setup automatically handles string IDs, you can drop the 'new ObjectId()')
    const query = { _id: new ObjectId(projectId) };

    // 3. Define atomic operations
    const updateDoc = {
      // $addToSet ONLY adds the string email if it doesn't already exist in the array
      // $addToSet: { volunteerEmail: newApplicant.email },
      
      // $push appends the full tracking object { name, email, appliedAt } to history tracking
      $push: { volunteerDetails: newApplicant },
      
      // $set updates the universal fields (date timestamp & current remaining slots count)
      // $set: { 
      //   volunteerRequestDate: volunteerRequestDate,
      //   volunteerCount: Number(volunteerCount) // Ensured as a number datatype
      // }
    };

    // 4. Execute the update using your database collection instance wrapper
    // (Replace 'projectsCollection' with whatever variable you use to query your MongoDB collection)
    const result = await projectCollection.updateOne(query, updateDoc,{ upsert: true});

    // 5. Evaluate execution results
    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, message: "Target project not found." });
    }

    res.status(200).json({
      success: true,
      message: "Volunteer application successfully logged to project!",
      modifiedCount: result.modifiedCount
    });

  } catch (error) {
    console.error("Backend Error on volunteerrequest route:", error);
    res.status(500).json({ 
      success: false, 
      message: "Internal Server Error occurred while parsing data.", 
      error: error.message 
    });
  }
});
app.put('/projects/applicant-status/:id', async (req, res) => {
  try {
    const projectId = req.params.id;
    const { email, status } = req.body;

    // 1. Validation check
    if (!email || !status) {
      return res.status(400).json({ 
        success: false, 
        message: "Email and status are required fields." 
      });
    }

    // 2. Query matches the project ID AND identifies the correct embedded array item
    const query = {
      _id: new ObjectId(projectId),
      "volunteerDetails.email": email
    };

    // 3. Update operation using the positional operator ($)
    const updateDoc = {
      $set: {
        // The '$' sign dynamically points to the array index that matched the email in your query
        "volunteerDetails.$.status": status,
        "lastUpdated": new Date()
      }
    };

    // 4. Run update query against your database collection
    // Replace 'projectsCollection' with your actual MongoDB collection variable
    const result = await projectCollection.updateOne(query, updateDoc);

    if (result.matchedCount === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Project matching that ID or applicant with that email was not found." 
      });
    }

    res.status(200).json({ 
      success: true, 
      message: `Applicant status successfully updated to '${status}'.`,
      modifiedCount: result.modifiedCount 
    });

  } catch (error) {
    console.error("Backend Error on applicant-status route:", error);
    res.status(500).json({ 
      success: false, 
      message: "Internal Server Error", 
      error: error.message 
    });
  }
});
app.put('/projects/verify-status/:id', async (req, res) => {
  try {
    const projectId = req.params.id;
    const { status, rejectionReason } = req.body; // Expects status values: 'verified' or 'rejected'

    if (!status) {
      return res.status(400).json({ success: false, message: "Status state definition variable is required." });
    }

    const query = { _id: new ObjectId(projectId) };
    
    // Construct dynamic assignment modifier block
    const updateDoc = {
      $set: {
        status: status, // Shifts 'published' to 'verified' or 'rejected'
        rejectionReason: status === 'rejected' ? rejectionReason : "", // Save string justification comment
        verifiedAt: new Date()
      }
    };

    // Replace 'projectsCollection' with your system database collection tracking instance
    const result = await projectCollection.updateOne(query, updateDoc);

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, message: "Target project proposal document not found." });
    }

    res.status(200).json({ 
      success: true, 
      message: `Project registry validation status shifted cleanly to: ${status}` 
    });

  } catch (error) {
    console.error("Backend project verification transaction logic crashed:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/projects/update-contributor-status/:projectId', async (req, res) => {
  const { projectId } = req.params;
  const { email, role, status } = req.body;

  // 1. Validation check
  if (!email || !role || !status) {
    return res.status(400).json({ 
      success: false, 
      message: "Missing required fields: email, role, or status must be provided." 
    });
  }

  try {
    let updateQuery = {};
    let arrayFilters = [];

    // 2. Identify array targeting rule based on unique role string definitions
    if (role === 'volunteer&donor') {
      // Targets the exact element inside the volunteerDetails array matching the user's email
      updateQuery = { "volunteerDetails.$[elem].status": status };
      arrayFilters = [{ "elem.email": email }];
    } else if (role === 'donor') {
      // Targets the exact element inside the donorDetails array matching the user's email
      updateQuery = { "donorDetails.$[elem].status": status };
      arrayFilters = [{ "elem.email": email }];
    } else {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid role specified. Must be 'volunteer&donor' or 'donor'." 
      });
    }

    // 3. Execute MongoDB Atomic Update Operator
    // Replace 'db.collection('projects')' with your actual Mongoose model (e.g., Project.updateOne) if applicable
    const result = await projectCollection.updateOne(
      { _id: new ObjectId(projectId) },
      { $set: updateQuery },
      { arrayFilters: arrayFilters }
    );

    // 4. Verify structural modifications
    if (result.matchedCount === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Target project container document could not be located." 
      });
    }

    if (result.modifiedCount === 0) {
      return res.status(200).json({ 
        success: true, 
        message: "No changes made. Status was already set to this state value." 
      });
    }

    return res.status(200).json({ 
      success: true, 
      message: `Contributor registry status successfully transitioned to ${status}.` 
    });

  } catch (error) {
    console.error("Database update error exception:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Internal server tracking error updating subdocument array matrix properties.", 
      error: error.message 
    });
  }
});
app.put('/users/update-profile/:email', async (req, res) => {
  const { email } = req.params;
  const { name, photoURL, bio, skills, education } = req.body;

  try {
    // 1. Sanitize incoming array matrices and build up runtime document patch payload
    const updatePayload = {
      displayName: name,
      photoURL: photoURL,
      bio: bio,
      skills: Array.isArray(skills) ? skills : [],
      education: education || ''
    };

    // 2. Perform modification via unique natural email key matching index rules
    // Note: If using native MongoDB driver use: db.collection('users').updateOne()
    // Note: If using Mongoose ORM models use: User.updateOne()
    const result =userCollection.updateOne(
      { email: email },
      { $set: updatePayload }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "No user document account registered under this matching parameter query."
      });
    }

    return res.status(200).json({
      success: true,
      message: "Target infrastructure schema profiles successfully modified on-cluster."
    });

  } catch (error) {
    console.error("Profile cluster saving error context runtime trace:", error);
    return res.status(500).json({
      success: false,
      message: "Internal tracking server exception mapping collection modifications.",
      error: error.message
    });
  }
});
app.put('/projects/volunteerrequest/:id', async (req, res) => {
  try {
    const projectId = req.params.id;
    const updatedProjectData = req.body;

   
    const { volunteerCount, volunteerDetails, volunteerEmail } = updatedProjectData;

   
    const filter = { _id: new ObjectId(projectId) };

    // ৩. ডাটাবেজ আপডেট অবজেক্ট সেট করা
    const updateDoc = {
      $set: {
        volunteerCount: Number(volunteerCount),
        volunteerDetails: volunteerDetails,
        volunteerEmail: volunteerEmail
      },
    };

    
    const result = await projectsCollection.updateOne(filter, updateDoc);

    if (result.modifiedCount > 0 || result.matchedCount > 0) {
      res.status(200).send({ 
        success: true, 
        message: "Volunteer request updated in database successfully!",
        result 
      });
    } else {
      res.status(404).send({ success: false, message: "Project not found or no changes made." });
    }

  } catch (error) {
    console.error("Backend Error:", error);
    res.status(500).send({ success: false, message: "Internal Server Error", error: error.message });
  }
});
app.get('/admin/dashboard-summary', async (req, res) => {
  try {
    const totalUsers = await userCollection.countDocuments();
    const ngoCount = await userCollection.countDocuments({ role: 'NGO' });
    const volunteerDonorCount = await userCollection.countDocuments({ role: 'volunteer&donor' });
    const activeProjects = await projectCollection.countDocuments({ status: 'verified' });
    const pendingVerifications = await userCollection.countDocuments({ status: 'Pending Verification' });

    const budgetAggregation = await projectCollection.aggregate([
      { $match: { status: 'verified' } },
      { $group: { _id: null, total: { $sum: '$budget' } } }
    ]).toArray();
    const totalDonationsAmount = budgetAggregation[0]?.total || 0;

    const recentUsersList = await userCollection.find()
      .sort({ _id: -1 })
      .limit(3)
      .toArray();

    const recentUsers = recentUsersList.map(u => ({
      key: u._id.toString(),
      name: u.userName || u.displayName || 'Anonymous System Node',
      email: u.email,
      role: u.role,
      status: u.status || 'verified'
    }));

    const trendsAggregation = await projectCollection.aggregate([
      { $match: { status: 'verified', date: { $exists: true } } },
      {
        $group: {
          _id: { $substr: ["$date", 5, 2] },
          totalBudget: { $sum: "$budget" }
        }
      },
      { $sort: { _id: 1 } }
    ]).toArray();

    const monthMap = { "01": "Jan", "02": "Feb", "03": "Mar", "04": "Apr", "05": "May", "06": "Jun", "07": "Jul", "08": "Aug", "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dec" };
    
    const trends = trendsAggregation.map(item => ({
      month: monthMap[item._id] || 'Active',
      donations: item.totalBudget,
      registrations: totalUsers
    }));

    res.status(200).json({
      counters: { totalUsers, ngoCount, volunteerDonorCount, activeProjects, totalDonationsAmount, pendingVerifications },
      trends: trends.length > 0 ? trends : [{ month: 'Current', donations: totalDonationsAmount, registrations: totalUsers }],
      recentUsers
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/ngo/dashboard-summary', async (req, res) => {
  try {
    const { email } = req.query;
    const projectFilter = email ? { ngoEmail: email } : {};
    const verifiedFilter = email ? { ngoEmail: email, status: 'verified' } : { status: 'verified' };

    const runningProjects = await projectCollection.countDocuments(verifiedFilter);
    
    const totalVolunteersAggregation = await projectCollection.aggregate([
      { $match: projectFilter },
      { $project: { count: { $size: { $ifNull: ["$volunteerDetails", []] } } } },
      { $group: { _id: null, total: { $sum: "$count" } } }
    ]).toArray();
    const activeVolunteers = totalVolunteersAggregation[0]?.total || 0;

    const localFundsAggregation = await projectCollection.aggregate([
      { $match: verifiedFilter },
      { $group: { _id: null, total: { $sum: '$budget' } } }
    ]).toArray();
    const totalDonations = localFundsAggregation[0]?.total || 0;

    const recentProjectsList = await projectCollection.find(projectFilter)
      .sort({ lastUpdated: -1 })
      .limit(3)
      .toArray();

    const chartData = recentProjectsList.map(p => ({
      month: p.title ? p.title.substring(0, 10) + '...' : 'Project',
      donations: p.budget || 0,
      reached: p.volunteerDetails ? p.volunteerDetails.length : 0
    }));

    res.status(200).json({
      stats: {
        totalDonations,
        activeVolunteers,
        runningProjects,
        impactReached: activeVolunteers * 3 
      },
      chartData: chartData.length > 0 ? chartData : [{ month: 'None', donations: 0, reached: 0 }],
      recentProjects: recentProjectsList.map(p => ({
        key: p._id.toString(),
        name: p.title || 'Untitled Proposal Shell',
        budget: Number(p.budget) || 0,
        status: p.status || 'verified'
      }))
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/user/volunteer-donor-summary', async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ success: false, message: "Email query parameter is mandatory." });
    }

    const userProfile = await userCollection.findOne({ email: email });

    const statusAggregation = await projectCollection.aggregate([
      { $unwind: "$volunteerDetails" },
      { $match: { "volunteerDetails.email": email } },
      {
        $group: {
          _id: null,
          totalApplied: { $sum: 1 },
          approvedCount: {
            $sum: { $cond: [{ $eq: ["$volunteerDetails.status", "Approved"] }, 1, 0] }
          },
          backedBudgetImpact: { $sum: "$budget" }
        }
      }
    ]).toArray();

    const metrics = statusAggregation[0] || { totalApplied: 0, approvedCount: 0, backedBudgetImpact: 0 };

    const personalApplications = await projectCollection.find({
      "volunteerDetails.email": email
    }).limit(3).toArray();

    const upcomingShifts = personalApplications.map((p, index) => {
      const match = p.volunteerDetails.find(v => v.email === email);
      return {
        key: p._id.toString() + index,
        project: p.title || 'Platform Initiative',
        role: userProfile?.role || 'volunteer&donor',
        date: match?.appliedAt ? match.appliedAt.substring(0, 10) : 'Pending',
        time: match?.status || 'Pending'
      };
    });

    res.status(200).json({
      stats: {
        totalDonated: metrics.backedBudgetImpact,
        hoursContributed: metrics.approvedCount * 6,
        pointsEarned: (userProfile?.skills?.length * 25) || 50,
        campaignsSupported: metrics.totalApplied
      },
      contributionHistory: [
        { month: 'Live Tracking', donations: metrics.backedBudgetImpact, hours: metrics.approvedCount * 6 }
      ],
      upcomingShifts,
      milestone: {
        currentLevel: metrics.approvedCount >= 2 ? 'Gold Guardian' : 'Silver Changemaker',
        nextLevel: 'Diamond Core Status',
        progressPercentage: Math.min((metrics.approvedCount / 4) * 100, 100)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


app.post('/payment/initiate', async (req, res) => {
  try {
    const { projectId, amount, userEmail, userName, cardOnly } = req.body;

    if (!projectId || !amount || !userEmail) {
      return res.status(400).json({ success: false, message: "Missing required tracking values." });
    }

    const tran_id = new ObjectId().toString(); 

    const paymentData = {
      total_amount: Number(amount),
      currency: 'BDT',
      tran_id: tran_id,
      
      // ⚡ পরিবর্তন: কুয়েরি প্যারামিটারের বদলে আমরা ভ্যালুগুলো ট্রানজেকশনের কাস্টম ফিল্ডে (value_a, value_b) পাস করব
      success_url: `http://localhost:5050/payment/success/${tran_id}`,
      fail_url: `http://localhost:5050/payment/fail/${tran_id}`,
      cancel_url: `http://localhost:5050/payment/cancel/${tran_id}`,
      ipn_url: `http://localhost:5050/payment/ipn`,
      
      shipping_method: 'No',
      product_name: 'Project Development Aid',
      product_category: 'Charity',
      product_profile: 'general',
      cus_name: userName || 'Anonymous Supporter',
      cus_email: userEmail,
      cus_add1: 'Savar, Dhaka',
      cus_city: 'Dhaka',
      cus_country: 'Bangladesh',
      cus_phone: '01711111111', 
      ship_name: 'N/A',
      ship_add1: 'N/A',
      ship_city: 'N/A',
      ship_country: 'N/A',
      
      // ⚡ কাস্টম ডেটা নিরাপদে ধরে রাখার জন্য SSLCommerz-এর নিজস্ব ফিল্ড ব্যবহার
      value_a: projectId,
      value_b: userEmail,

      allowed_payment_panel: cardOnly ? 'cardpayment' : 'both',
      multi_card_name: 'visa,mastercard,amex'
    };

    const sslcommerz = new SSLCommerzPayment(store_id, store_pass, is_live);
    sslcommerz.init(paymentData).then(apiResponse => {
      if (apiResponse?.GatewayPageURL) {
        res.send({ url: apiResponse.GatewayPageURL });
      } else {
        res.status(400).json({ success: false, message: "Gateway initialization timed out." });
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── ✅ 2. SUCCESS HOOK & DATABASE UPDATE (POST /payment/success/:tranId) ───
app.post('/payment/success/:tranId', async (req, res) => {
  try {
    const { tranId } = req.params;
    
    
    const paymentResponse = req.body;

    
    if (paymentResponse && paymentResponse.status === 'VALID') {
      
      const confirmedAmount = Number(paymentResponse.amount);
      
   
      const projectId = paymentResponse.value_a;
      const email = paymentResponse.value_b;

      if (!projectId || !email) {
        console.error("Tracking metadata lost in callback loop.");
        return res.redirect(`http://localhost:5173/donor?status=invalid`);
      }

      const donorReceipt = {
        transactionId: tranId,
        email: email,
        amount: confirmedAmount,
        donatedAt: new Date(),
        status: "Approved"
      };


      await projectCollection.updateOne(
        { _id: new ObjectId(projectId) },
        { 
          $push: { donorDetails: donorReceipt },
          $set: { lastUpdated: new Date() }
        }
      );

      return res.redirect(`http://localhost:5173/donor?status=success&tran=${tranId}`);
    } else {
      console.log(`Validation flag rejected by gateway for transaction: ${tranId}`);
      return res.redirect(`http://localhost:5173/donor?status=invalid`);
    }
  } catch (error) {
    console.error("Critical success callback crash:", error);
    res.status(500).send("Critical transaction synchronization crash.");
  }
});


app.post('/payment/fail/:tranId', async (req, res) => {
  res.redirect(`http://localhost:5173/donor?status=failed`);
});


app.post('/payment/cancel/:tranId', async (req, res) => {
  res.redirect(`http://localhost:5173/donor?status=cancelled`);
});
    console.log("MongoDB Connected ✅");

  } finally {
    // optional: keep connection alive
  }
}


// run function
run().catch(console.dir);

// server start
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});




// npx nodemon index.js