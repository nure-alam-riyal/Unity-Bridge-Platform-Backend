const express = require('express');
const cors = require('cors');
const SSLCommerzPayment = require('sslcommerz-lts');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = process.env.PORT || 5050;

// Middleware
app.use(cors({
  origin: [
    'https://unity-bridge-platform.vercel.app',
    'http://localhost:5173',
    'https://unity-bridge-platform-1ghnietse-riyals-projects-32cf7dde.vercel.app'
    


  ],
  credentials: true,
}))
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const store_id = process.env.STORE_ID;
const store_pass = process.env.STORE_PASS;
const is_live = process.env.IS_SANDBOX === 'false';

// MongoDB Connection URI
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
    console.log("MongoDB Connected ✅");

    const userCollection = client.db("UnityBridgePlatform").collection("users");
    const projectCollection = client.db("UnityBridgePlatform").collection("projects");

    // GET all users
    app.get('/users', async (req, res) => {
      try {
        const users = await userCollection.find().toArray();
        res.send(users);
      } catch (error) {
        res.status(500).send({ error: error.message });
      }
    });

    // GET all projects
    app.get('/projects', async (req, res) => {
      try {
        const projects = await projectCollection.find().toArray();
        res.send(projects);
      } catch (error) {
        res.status(500).send({ error: error.message });
      }
    });




    // GET single project by ID
    app.get('/projects/:id', async (req, res) => {
      try {
        const id = req.params.id;
        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ error: 'Invalid MongoDB ID format' });
        }
        const query = { _id: new ObjectId(id) };
        const project = await projectCollection.findOne(query);
        if (!project) {
          return res.status(404).send({ message: "Project not found" });
        }
        res.send(project);
      } catch (error) {
        res.status(500).send({ error: error.message });
      }
    });


    // POST register new user
    app.post('/users', async (req, res) => {
      try {
        const user1 = req.body;
        if (!user1.email) {
          return res.status(400).send({ message: "Missing required field: email" });
        }

        const isUserExist = await userCollection.findOne({ email: user1.email });
        if (isUserExist) {
          return res.status(400).send({ message: "User already exists" });
        }

        const user = {
          name: user1.userName,
          email: user1.email,
          password: user1.password,
          image: user1.image,
          role: user1.role,
          NIDorBRITH: user1.NIDorBRITH,
          joinedDate: new Date()
        };

        const result = await userCollection.insertOne(user);
        res.send(result);
      } catch (error) {
        res.status(500).send({ error: error.message });
      }
    });

    // POST add new project
    app.post('/projects', async (req, res) => {
      try {
        const newProject = req.body;
        const result = await projectCollection.insertOne(newProject);
        res.status(201).send(result);
      } catch (error) {
        res.status(500).send({ error: error.message });
      }
    });

    // PUT change user verification status (Admin tool)
    app.put('/users/verify-status/:id', async (req, res) => {
      try {
        const userId = req.params.id;
        const { status } = req.body; // 'verified', 'rejected', etc.

        if (!status) {
          return res.status(400).json({ success: false, message: "Verification status parameter is required." });
        }

        if (!ObjectId.isValid(userId)) {
          return res.status(400).json({ success: false, message: "Invalid User ID format." });
        }

        const query = { _id: new ObjectId(userId) };
        const updateDoc = {
          $set: {
            status: status,
            statusLastModifiedByAdmin: new Date()
          }
        };

        const result = await userCollection.updateOne(query, updateDoc);
        if (result.matchedCount === 0) {
          return res.status(404).json({ success: false, message: "Target user profile not found." });
        }

        res.status(200).json({
          success: true,
          message: `User verification status updated to: ${status}`
        });
      } catch (error) {
        console.error("Error validating user status:", error);
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // PUT edit project details
    app.put('/projects/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const updatedProject = req.body;

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
            status: updatedProject.status, // e.g., 'draft', 'published'
            ngoEmail: updatedProject.ngoEmail,
            ngoName: updatedProject.ngoName,
            lastUpdated: updatedProject.lastUpdated || new Date().toISOString()
          },
        };

        const result = await projectCollection.updateOne(query, updateDoc, { upsert: true });
        res.send(result);
      } catch (error) {
        console.error("Database Update Error:", error);
        res.status(500).send({ error: error.message });
      }
    });

    // PUT request to join project as volunteer
    app.put('/projects/volunteerrequest/:id', async (req, res) => {
      try {
        const projectId = req.params.id;
        const { volunteerDetails } = req.body;

        if (!volunteerDetails || volunteerDetails.length === 0) {
          return res.status(400).json({ success: false, message: "No volunteer data provided." });
        }

        if (!ObjectId.isValid(projectId)) {
          return res.status(400).json({ success: false, message: "Invalid Project ID format." });
        }

        const newApplicant = volunteerDetails[volunteerDetails.length - 1];
        const query = { _id: new ObjectId(projectId) };

        const updateDoc = {
          $push: { volunteerDetails: newApplicant }
        };

        const result = await projectCollection.updateOne(query, updateDoc, { upsert: true });
        if (result.matchedCount === 0) {
          return res.status(404).json({ success: false, message: "Target project not found." });
        }

        res.status(200).json({
          success: true,
          message: "Volunteer application successfully logged to project!",
          modifiedCount: result.modifiedCount
        });
      } catch (error) {
        console.error("Error on volunteerrequest route:", error);
        res.status(500).json({
          success: false,
          message: "Internal Server Error occurred while updating volunteer requests.",
          error: error.message
        });
      }
    });

    // PUT update single applicant's status
    app.put('/projects/applicant-status/:id', async (req, res) => {
      try {
        const projectId = req.params.id;
        const { email, status } = req.body;

        if (!email || !status) {
          return res.status(400).json({
            success: false,
            message: "Email and status are required fields."
          });
        }

        if (!ObjectId.isValid(projectId)) {
          return res.status(400).json({ success: false, message: "Invalid Project ID format." });
        }

        const query = {
          _id: new ObjectId(projectId),
          "volunteerDetails.email": email
        };

        const updateDoc = {
          $set: {
            "volunteerDetails.$.status": status,
            "lastUpdated": new Date()
          }
        };

        const result = await projectCollection.updateOne(query, updateDoc);
        if (result.matchedCount === 0) {
          return res.status(404).json({
            success: false,
            message: "Project matching ID or applicant email not found."
          });
        }

        res.status(200).json({
          success: true,
          message: `Applicant status updated to '${status}'.`,
          modifiedCount: result.modifiedCount
        });
      } catch (error) {
        console.error("Error on applicant-status route:", error);
        res.status(500).json({
          success: false,
          message: "Internal Server Error",
          error: error.message
        });
      }
    });

    // PUT verify or reject project proposal (Admin tool)
    app.put('/projects/verify-status/:id', async (req, res) => {
      try {
        const projectId = req.params.id;
        const { status, rejectionReason } = req.body; // 'verified' or 'rejected'

        if (!status) {
          return res.status(400).json({ success: false, message: "Status parameter is required." });
        }

        if (!ObjectId.isValid(projectId)) {
          return res.status(400).json({ success: false, message: "Invalid Project ID format." });
        }

        const query = { _id: new ObjectId(projectId) };
        const updateDoc = {
          $set: {
            status: status,
            rejectionReason: status === 'rejected' ? rejectionReason : "",
            verifiedAt: new Date()
          }
        };

        const result = await projectCollection.updateOne(query, updateDoc);
        if (result.matchedCount === 0) {
          return res.status(404).json({ success: false, message: "Target project proposal not found." });
        }

        res.status(200).json({
          success: true,
          message: `Project status updated to: ${status}`
        });
      } catch (error) {
        console.error("Project verification error:", error);
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // PUT update contributor status (volunteer or donor list)
    app.put('/projects/update-contributor-status/:projectId', async (req, res) => {
      const { projectId } = req.params;
      const { email, role, status } = req.body;

      if (!email || !role || !status) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields: email, role, or status."
        });
      }

      if (!ObjectId.isValid(projectId)) {
        return res.status(400).json({ success: false, message: "Invalid Project ID format." });
      }

      try {
        let updateQuery = {};
        let arrayFilters = [];

        if (role === 'volunteer&donor') {
          updateQuery = { "volunteerDetails.$[elem].status": status };
          arrayFilters = [{ "elem.email": email }];
        } else if (role === 'donor') {
          updateQuery = { "donorDetails.$[elem].status": status };
          arrayFilters = [{ "elem.email": email }];
        } else {
          return res.status(400).json({
            success: false,
            message: "Invalid role specified. Must be 'volunteer&donor' or 'donor'."
          });
        }

        const result = await projectCollection.updateOne(
          { _id: new ObjectId(projectId) },
          { $set: updateQuery },
          { arrayFilters: arrayFilters }
        );

        if (result.matchedCount === 0) {
          return res.status(404).json({
            success: false,
            message: "Target project document could not be located."
          });
        }








        if (result.modifiedCount === 0) {
          return res.status(200).json({
            success: true,
            message: "No changes made. Status was already set to this state."
          });
        }

        return res.status(200).json({
          success: true,
          message: `Contributor status updated to ${status}.`
        });
      } catch (error) {
        console.error("Contributor status update error:", error);
        return res.status(500).json({
          success: false,
          message: "Internal server error updating contributor status.",
          error: error.message
        });
      }
    });

    // PUT update user profile settings
    app.put('/users/update-profile/:email', async (req, res) => {
      const { email } = req.params;
      const { name, bio, skills, education, image } = req.body;

      try {
        const updatePayload = {
          displayName: name,
          image: image,
          bio: bio,
          skills: Array.isArray(skills) ? skills : [],
          education: education || ''
        };

        // Fixed bug: added missing `await` keyword to complete DB transaction before assertions
        const result = await userCollection.updateOne(
          { email: email },
          { $set: updatePayload }
        );

        if (result.matchedCount === 0) {
          return res.status(404).json({
            success: false,
            message: "No user account registered under this email."
          });
        }

        return res.status(200).json({
          success: true,
          message: "Profile updated successfully."
        });
      } catch (error) {
        console.error("Profile saving error:", error);
        return res.status(500).json({
          success: false,
          message: "Internal server error saving profile settings.",
          error: error.message
        });
      }
    });

    // GET admin dashboard summary metrics
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

    // GET NGO dashboard summary metrics
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

    // GET Volunteer & Donor personal stats summary
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

    // POST payment gateway initiation
    app.post('/payment/initiate', async (req, res) => {
      try {
        const { projectId, amount, userEmail, userName, cardOnly } = req.body;

        if (!projectId || !amount || !userEmail) {
          return res.status(400).json({ success: false, message: "Missing required parameters." });
        }

        const tran_id = new ObjectId().toString();

        const paymentData = {
          total_amount: Number(amount),
          currency: 'BDT',
          tran_id: tran_id,
          success_url: `https://unity-bridge-platform-backend.vercel.app/payment/success/${tran_id}`,
          fail_url: `https://unity-bridge-platform-backend.vercel.app/payment/fail/${tran_id}`,
          cancel_url: `https://unity-bridge-platform-backend.vercel.app/payment/cancel/${tran_id}`,
          ipn_url: `https://unity-bridge-platform-backend.vercel.app/payment/ipn`,
          // success_url: `http://localhost:5050/payment/success/${tran_id}`,
          // fail_url: `http://localhost:5050/payment/fail/${tran_id}`,
          // cancel_url: `http://localhost:5050/payment/cancel/${tran_id}`,
          // ipn_url: `http://localhost:5050/payment/ipn`,
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

    // POST payment gateway success webhook/callback
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
            return res.redirect(`https://unity-bridge-platform.vercel.app/donor?status=invalid`);
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

          return res.redirect(`https://unity-bridge-platform.vercel.app/donor?status=success&tran=${tranId}`);
        } else {
          console.log(`Validation flag rejected by gateway for transaction: ${tranId}`);
          return res.redirect(`https://unity-bridge-platform.vercel.app/donor?status=invalid`);
        }
      } catch (error) {
        console.error("Critical success callback error:", error);
        res.status(500).send("Critical transaction synchronization crash.");
      }
    });

    // POST payment fail callback
    app.post('/payment/fail/:tranId', async (req, res) => {
      res.redirect(`https://unity-bridge-platform.vercel.app/donor?status=failed`);
    });

    // POST payment cancel callback
    app.post('/payment/cancel/:tranId', async (req, res) => {
      res.redirect(`https://unity-bridge-platform.vercel.app/donor?status=cancelled`);
    });

  } catch (err) {
    console.error("Failed to execute server setup script:", err);
  }
}

// Default route
app.get('/', (req, res) => {
  res.send('Unity Bridge Platform Server is running');
});

// Run server initialization
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});