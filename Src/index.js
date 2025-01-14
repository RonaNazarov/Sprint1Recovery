const express = require("express")
const port = process.env.PORT || 3000
const app = express()
app.set("view engine", "ejs")
app.use(express.static("public"))
const session = require("express-session")
const { authUser, authRole } = require("./simpleAuth")
// initialize express-session to allow us track the logged-in user across sessions.
app.use(
	session({
		key: "user_sid",
		secret: "somerandonstuffs",
		resave: false,
		saveUninitialized: false,
		cookie: {
			expires: 600000,
		},
	})
)

const MongoClient = require("mongodb").MongoClient
const bodyParser = require("body-parser")
MongoClient.connect("mongodb+srv://ivan:!Joni1852!@cluster0.vb8as.mongodb.net/myFirstDatabase?retryWrites=true&w=majority", { useUnifiedTopology: true }).then(client => {
	console.log("Connected to Database")
	app.use(bodyParser.urlencoded({ extended: true }))

	// GET functions
	app.get("/", (req, res) => {
		res.render("Homepage")
		res.status(200)
	})

	app.get("/Login", (req, res) => {
		res.render("Login")
	})

	app.get("/contributers", (req, res) => {
		res.render("contributers_page")
	})

	app.get("/forgot_my_password", (req, res)=> {
		res.render("forgot_my_password")
	})

	app.get("/forgot_my_username", (req, res)=> {
		res.render("forgot_my_username")
	})

	app.get("/CompanyWorkerHomepage", authUser, authRole("Company Worker"), (req, res) => {
		res.render("CompanyWorkerHomepage",{name:req.session.user.fullname})
	})

	app.get("/recruiters_home_page", authUser, authRole("Recruiter"), (req, res) => {
		var db = client.db("contractor-workers")
		var db_collection = db.collection("contractorWorkers")
		function sortByProperty(property){  
			return function(a,b){
				if(a[property] < b[property]){
					return 1}
				else if(a[property] > b[property]){
					return -1}
				return 0}
		}
		db_collection.find().toArray(function (err, allDetails) {
			if (err) {
				console.log(err)
			}
			else {
				allDetails.sort(sortByProperty("average_rate")) 
				res.render("recruiters_home_page", { details: allDetails, name:req.session.user.fullname })
			}
		})
	})

	app.get("/contractor_add_new_shift", (req, res) => {
		res.render("contractor_add_new_shift")
	})

	app.get("/Register", (req, res) => {
		res.render("Register")
	})

	app.get("/add_new_contractor_worker", authUser, authRole("Company Worker"), (req, res) => {
		res.render("add_new_contractor_worker")
	})

	app.get("/contractor_job_requests_status", authUser, (req, res) => {
		var db = client.db("contractor-workers")
		var db_collection = db.collection("contractorWorkers")
		db_collection.find({ "id": req.session.user.id }).toArray(function (err, allDetails) {
			if (err) {
				console.log(err)
			}
			else {
				var waiting_requests = allDetails[0].job_requests
				var approved_requests = allDetails[0].hiring
				var canceled_requests = allDetails[0].canceled_jobs
				var all_job_requests = waiting_requests.concat(approved_requests, canceled_requests)
				res.render("contractor_job_requests_status", { details: all_job_requests })
			}
		})
	})

	app.get("/contractor_worker_edit_shift/:date", authUser, (req, res) => {
		var hire_old_date = req.params.date
		hire_old_date = hire_old_date.replace(".", "/")
		hire_old_date = hire_old_date.replace(".", "/")
		console.log(hire_old_date)
		var start = null
		var end = null
		var rec_id = null
		var db = client.db("contractor-workers")
		var db_collection = db.collection("contractorWorkers")

		db_collection.find({ "id": req.session.user.id }).toArray(function (err, allDetails) {
			if (err) {
				console.log(err)
			}
			else {
				var contr_shifts = allDetails[0].shifts
				for (var i = 0; i < contr_shifts.length; ++i) {
					if (contr_shifts[i][0] == hire_old_date) {
						start = contr_shifts[i][1]
						end = contr_shifts[i][2]
						rec_id = contr_shifts[i][3]
					}
				}
				res.render("contractor_worker_edit_shift", { "old_date": hire_old_date, "end_hire": end, "start_hire": start, "rec_id": rec_id })
			}
		})

	})

	app.get("/contractor_shifts", authUser, (req, res) => {
		var db = client.db("contractor-workers")
		var db_collection = db.collection("contractorWorkers")

		db_collection.find({ "id": req.session.user.id }).toArray(function (err, allDetails) {
			if (err) {
				console.log(err)
			}
			else {
				var contr_shifts = allDetails[0].shifts
				res.render("contractor_shifts", { details: contr_shifts, type: "Contractor Worker" })
			}
		})

	})

	app.get("/view_a_contractor_shifts/:id", authUser, (req, res) => {
		var db = client.db("contractor-workers")
		var db_collection = db.collection("contractorWorkers")

		db_collection.find({"id": req.params.id}).toArray(function (err, allDetails) {
			if (err) {
				console.log(err)
			}
			else {
				var all_shifts = []
				for (var j = 0; j < allDetails[0].shifts.length; ++j) {
					var curr_shift = allDetails[0].shifts[j]
					curr_shift.push(req.params.id)
					all_shifts.push(curr_shift)
				}
				res.render("company_worker_shifts_monitor", { details: all_shifts, name: allDetails[0].first_name + " " + allDetails[0].last_name })
			}
		})

	})

	app.get("/monitor_of_all_hires", authUser, authRole("Company Worker"), (req, res) => {
		var db = client.db("contractor-workers")
		var db_collection = db.collection("contractorWorkers")

		db_collection.find().toArray(function (err, allDetails) {
			if (err) {
				console.log(err)
			}
			else {
				var all_hiring = []
				for (var i = 0; i < allDetails.length; ++i) {
					var contractor_hirings = allDetails[i].hiring
					for (var j = 0; j < contractor_hirings.length; ++j) {
						var one_hire = {
							"contractor_id": allDetails[i].id,
							"full_name": allDetails[i].first_name + " " + allDetails[i].last_name,
							"date": contractor_hirings[j][0],
							"start": contractor_hirings[j][1],
							"end": contractor_hirings[j][2],
							"recrutier_id": contractor_hirings[j][3]
						}
						all_hiring.push(one_hire)
					}

				}
				res.render("monitor_of_all_hires", { details: all_hiring })
			}
		})
	})

	app.get("/statistics", authUser, authRole("Company Worker"), (req, res) => {
		res.render("statistic_analysis", {final_datasets: null, msg:null})
	})

	app.get("/shifts_monitor", authUser, authRole("Company Worker"), (req, res) => {
		var db = client.db("contractor-workers")
		var db_collection = db.collection("contractorWorkers")

		db_collection.find().toArray(function (err, allDetails) {
			if (err) {
				console.log(err)
			}
			else {
				var all_shifts = []
				for (var i = 0; i < allDetails.length; ++i) {
					var curr_contractor_worker = allDetails[i].id
					for (var j = 0; j < allDetails[i].shifts.length; ++j) {
						var curr_shift = allDetails[i].shifts[j]
						curr_shift.push(curr_contractor_worker)
						all_shifts.push(curr_shift)
					}

				}
				res.render("company_worker_shifts_monitor", { details: all_shifts, name: null })
			}
		})
	})

	app.get("/why_us_page", (req, res) => {
		res.render("why_us_page")
	})

	app.get("/contractor_worker_home_page", authUser, authRole("Contractor Worker"), (req, res) => {
		res.render("contractor_worker_home_page",{name:req.session.user.fullname})
	})

	app.get("/send_data_calendar", authUser, authRole("Contractor Worker"), (req, res) => {
		// Connect contractor workers db and collection
		var db = client.db("contractor-workers")
		var db_collection = db.collection("contractorWorkers")
		db_collection.find({ "id": req.session.user.id }).toArray(function (err, allDetails) {
			if (err) {
				console.log(err)
			}
			else {
				console.log(allDetails[0].hiring)
				res.send(allDetails)
			}
		})
	})


	app.get("/contractor_worker_profile/:id", authUser, (req, res) => {
		// Connect contractor workers db and collection
		var db = client.db("contractor-workers")
		var db_collection = db.collection("contractorWorkers")
		db_collection.find({ "id": req.params.id }).toArray(function (err, allDetails) {
			if (err) {
				console.log(err)
			}
			else {
				res.render("contractor_worker_profile", { details: allDetails, type: req.session.user.type })
			}
		})
	})

	app.get("/contractor_worker_edit_my_profile", authUser, authRole("Contractor Worker"), (req, res) => {
		// Connect contractor workers db and collection
		var db = client.db("contractor-workers")
		var db_collection = db.collection("contractorWorkers")
		db_collection.find({ "id": req.session.user.id }).toArray(function (err, allDetails) {
			if (err) {
				console.log(err)
			}
			else {
				var user = allDetails[0]
				res.render("contractor_worker_edit_profile", { "type": "Contractor Worker", "id": user.id, "first_name": user.first_name, "last_name": user.last_name, "city": user.city, "home": user.home, "phone": user.phone_number, "email": user.email, "gender": user.gender })
			}
		})
	})

	app.get("/contractor_worker_edit_profile/:id", authUser, authRole("Company Worker"), (req, res) => {
		// Connect contractor workers db and collection
		var db = client.db("contractor-workers")
		var db_collection = db.collection("contractorWorkers")
		db_collection.find({ "id": req.params.id }).toArray(function (err, allDetails) {
			if (err) {
				console.log(err)
			}
			else {
				var user = allDetails[0]
				res.render("contractor_worker_edit_profile", { "type": "Company Worker","id": user.id, "first_name": user.first_name, "last_name": user.last_name, "city": user.city, "home": user.home, "phone": user.phone_number, "email": user.email, "gender": user.gender })
			}
		})
	})

	app.get("/careers", (req, res) => {
		res.render("careers_page")
	})

	app.get("/contact_us", (req, res) => {
		res.render("contact_us_page")
	})
	// של איוון לא למחוקקקקקקק
	app.get("/contractor_pay_rates", authUser, authRole("Contractor Worker"), (req, res) => {
		var db = client.db("contractor-workers")
		var db_collection = db.collection("contractorWorkers")
		db_collection.find({ "id": req.session.user.id }).toArray(function (err, allDetails) {
			if (err) {
				console.log(err)
			}
			else {
				res.render("contractor_pay_rates", { details: allDetails })
			}
		})
	})
	app.get("/get_data_payrate", authUser, authRole("Contractor Worker"), (req, res) => {
		var db = client.db("contractor-workers")
		var db_collection = db.collection("contractorWorkers")
		db_collection.find({ "id": req.session.user.id }).toArray(function (err, allDetails) {
			if (err) {
				console.log(err)
			}
			else {
				res.send({ details: allDetails })
			}
		})
	})
	app.get("/contractor_worker_work_history", authUser, authRole("Contractor Worker"), (req, res) => {
		var db = client.db("contractor-workers")
		var db_collection = db.collection("contractorWorkers")
		db_collection.find({ "id": req.session.user.id }).toArray(function (err, allDetails) {
			if (err) {
				console.log(err)
			}
			else {
				var full_name = allDetails[0].first_name + " " + allDetails[0].last_name
				res.render("contractor_work_history", { "type": "Contractor Worker", "full_name": full_name, "work_history": allDetails[0].work_history, "total_pay": null, "total_hours_for_month": null, "total_minutes_for_month": null})
			}
		})
	})

	app.get("/view_contractor_worker_work_history/:id", authUser, authRole("Company Worker"), (req, res) => {
		var db = client.db("contractor-workers")
		var db_collection = db.collection("contractorWorkers")
		db_collection.find({ "id": req.params.id }).toArray(function (err, allDetails) {
			if (err) {
				console.log(err)
			}
			else {
				var full_name = allDetails[0].first_name + " " + allDetails[0].last_name
				res.render("contractor_work_history", { "type": "Company Worker","full_name": full_name, "work_history": allDetails[0].work_history, "total_pay": null, "total_hours_for_month": null, "total_minutes_for_month": null})
			}
		})
	})

	app.get("/ranking", authUser, authRole("Recruiter"), (req, res) => {
		var db = client.db("employers-workers")
		var db_collection = db.collection("employersWorkers")
		db_collection.find({ "id": req.session.user.id }).toArray(function (err, allDetails) {
			if (err) {
				console.log(err)
			}
			else {
				let newArray=[]
				for(let i = 0; i < allDetails[0].work_history.length;++i){
					if( allDetails[0].work_history[i][5] == ""){
						newArray.push(allDetails[0].work_history[i])
					}
				}
				res.render("employe_rating", { details: newArray })
			}
		})
	})
	app.post("/rating_send", (req, res) => {
		var db = client.db("employers-workers")
		var db_collection = db.collection("employersWorkers")
		var db1 = client.db("contractor-workers")
		var db_collection1 = db1.collection("contractorWorkers")
		let rate = req.body.rating
		let person=req.body.person
		var company_name
		db_collection.find({ "id": req.session.user.id }).toArray(function (err, allDetails){
			if(err) throw new Error(err.message, null)
			company_name=allDetails[0].company_name
			person=person.split(",")
			db_collection.updateOne({ "id": req.session.user.id, "work_history": { $in: [[person[0], person[1], person[2], person[3], person[4], person[5]]] } }, { $set: { "work_history": [[person[0], person[1], person[2],person[3], person[4], rate]] } })
			db_collection1.updateOne({ "id": person[3] , "work_history": { $in: [[person[0], person[1], person[2], req.session.user.id,company_name, person[5]]] } }, { $set: { "work_history": [[person[0], person[1], person[2], req.session.user.id,company_name, rate]] } })
			db_collection1.find({ "id": person[3] }).toArray(function (err, allDetails){
				if(err) throw new Error(err.message, null)
				db_collection1.updateOne({ "id": person[3] , "number_of_rates": { $in: [allDetails[0].number_of_rates] } }, { $set: { "number_of_rates": [allDetails[0].number_of_rates+1]} })
				db_collection1.updateOne({ "id": person[3] , "average_rate": { $in: [allDetails[0].average_rate] } }, { $set: { "average_rate": [allDetails[0].average_rate+rate]} })
			})
			db_collection.find({ "id": req.session.user.id }).toArray(function (err, allDetails) {
				if (err) {
					console.log(err)
				}
				else {
					let newArray=[]
					for(let i = 0; i < allDetails[0].work_history.length;++i){
						if( allDetails[0].work_history[i][5] == ""){
							newArray.push(allDetails[0].work_history[i])
						}
					}
					res.render("employe_rating", { details: newArray })
				}
			})
			
		} )
	
	})

	app.get("/contractor_job_requests", authUser, authRole("Contractor Worker"), (req, res) => {
		var db = client.db("contractor-workers")
		var db_collection = db.collection("contractorWorkers")
		db_collection.find({ "id": req.session.user.id }).toArray(function (err, allDetails) {
			if (err) {
				console.log(err)
			}
			else {
				var job_requests = allDetails[0].job_requests
				res.render("contractor_job_requests", { details: job_requests })
			}
		})
	})
	app.get("/accept_job_request/:recrutier_date", authUser, (req, res) => {
		var data = req.params.recrutier_date
		data = data.split("_")
		var rec_id = data[0]
		var date = data[1]
		date = date.split(".")
		date = date.join("/")
		var db = client.db("contractor-workers")
		var db_collection = db.collection("contractorWorkers")
		db_collection.find({ "id": req.session.user.id }).toArray(function (err, allDetails) {
			if (err) {
				console.log(err)
			}
			else {
				var job_requests = allDetails[0].job_requests
				var start = null
				var end = null

				for (var i = 0; i < job_requests.length; ++i) {
					if (job_requests[i][0] == date && job_requests[i][3] == rec_id) {
						start = job_requests[i][1]
						end = job_requests[i][2]
						break
					}
				}
				db_collection.updateOne({ "id": req.session.user.id, "job_requests": { $in: [[date, start, end, rec_id, "Waiting for approval"]] } }, { $pull: { "job_requests": { $in: [[date, start, end, rec_id, "Waiting for approval"]] } } })
				if (db_collection.updateOne({ "id": req.session.user.id }, { $push: { hiring: [date, start, end, rec_id, "Approved"] } })) {
					db = client.db("employers-workers")
					db_collection = db.collection("employersWorkers")
					db_collection.updateOne({ "id": rec_id, "job_requests": { $in: [[date, start, end, req.session.user.id, "Waiting for approval"]] } }, { $pull: { "job_requests": { $in: [[date, start, end, req.session.user.id, "Waiting for approval"]] } } })
					db_collection.updateOne({ "id": rec_id }, { $push: { hiring: [date, start, end, req.session.user.id, "Approved"] } })
					res.redirect("/contractor_worker_home_page",{name:req.session.user.fullname})
				}
				else {
					res.redirect("/contractor_worker_home_page",{name:req.session.user.fullname})
				}
			}
		})
	})

	app.get("/decline_job_request/:recrutier_date", authUser, (req, res) => {
		var data = req.params.recrutier_date
		data = data.split("_")
		var rec_id = data[0]
		var date = data[1]
		date = date.split(".")
		date = date.join("/")

		var db = client.db("contractor-workers")
		var db_collection = db.collection("contractorWorkers")
		db_collection.find({ "id": req.session.user.id }).toArray(function (err, allDetails) {
			if (err) {
				console.log(err)
			}
			else {
				var job_requests = allDetails[0].job_requests
				var start = null
				var end = null

				for (var i = 0; i < job_requests.length; ++i) {
					if (job_requests[i][0] == date && job_requests[i][3] == rec_id) {
						start = job_requests[i][1]
						end = job_requests[i][2]
						break
					}
				}
				db_collection.updateOne({ "id": req.session.user.id, "job_requests": { $in: [[date, start, end, rec_id, "Waiting for approval"]] } }, { $pull: { "job_requests": { $in: [[date, start, end, rec_id, "Waiting for approval"]] } } })
				if (db_collection.updateOne({ "id": req.session.user.id }, { $push: { canceled_jobs: [date, start, end, rec_id, "Declined"] } })) {
					db = client.db("employers-workers")
					db_collection = db.collection("employersWorkers")
					db_collection.updateOne({ "id": rec_id, "job_requests": { $in: [[date, start, end, req.session.user.id, "Waiting for approval"]] } }, { $pull: { "job_requests": { $in: [[date, start, end, req.session.user.id, "Waiting for approval"]] } } })
					db_collection.updateOne({ "id": rec_id }, { $push: { canceled_jobs: [date, start, end, req.session.user.id, "Declined"] } })
					res.redirect("/contractor_worker_home_page",{name:req.session.user.fullname})
				}
				else {
					res.redirect("/contractor_worker_home_page",{name:req.session.user.fullname})
				}
			}
		})
	})

	app.get("/company_worker_confirm_shift/:contractor_date", authUser, (req, res) => {
		var data = req.params.contractor_date
		data = data.split("_")
		var contractor_id = data[0]
		var date = data[1]
		date = date.split(".")
		date = date.join("/")
		var rec_id = null
		var total_pay = 0
		var start = ""
		var end = ""
		var contractor_full_name = ""

		var db = client.db("contractor-workers")
		var db_collection = db.collection("contractorWorkers")
		// Update DB that the shift is confirmed - entering it to array ratings
		// rec name, total pay, date
		db_collection.find({ "id": contractor_id }).toArray(function (err, allDetails) {
			if (err) {
				console.log(err)
			}
			else {
				// Get contractor hourly pay
				var hourly_pay = allDetails[0].hourly_pay
				contractor_full_name = allDetails[0].first_name + " " + allDetails[0].last_name
				// Find the recrutier that's hired him for this job
				var con_shifts = allDetails[0].shifts
				for (var i = 0; i < con_shifts.length; ++i) {
					if (con_shifts[i][0] == date) {
						rec_id = con_shifts[i][3]
						start = con_shifts[i][1]
						end = con_shifts[i][2]
						total_pay = totalPayForShift(start, end, hourly_pay)
						if(!total_pay) {
							//let alert = require('alert');  
							//alert("Message: This shift has en error in it's hours, you can't confirm it.\nYou need to report it.")
							res.redirect("/shifts_monitor")
							break
						}
						break
					}
				}
				// Find recurtier company name
				var recrutiers_db = client.db("employers-workers")
				var recrutiers_db_collection = recrutiers_db.collection("employersWorkers")

				recrutiers_db_collection.find({ "id": rec_id }).toArray(function (err, allDetails) {
					if (err) {
						console.log(err)
					}
					else {
						var rec_company_name = allDetails[0].company_name
						db_collection.updateOne({ "id": contractor_id }, { $push: { ratings: [rec_company_name, total_pay.toString(), date] } })
						db_collection.updateOne({ "id": contractor_id, "shifts": { $in: [[date, start, end, rec_id]] } }, { $pull: { "shifts": { $in: [[date, start, end, rec_id]] } } })
						// Push this shift to the history of the contractor
						db_collection.updateOne({ "id": contractor_id }, { $push: { work_history: [date, start, end, rec_id, rec_company_name,""] } })
						// Push this shift to the history of the recrutier
						recrutiers_db_collection.updateOne({ "id": rec_id }, { $push: { work_history: [date, start, end, contractor_id, contractor_full_name] } })
						res.redirect("/shifts_monitor")
					}
				})

			}
		})


	})

	app.get("/company_worker_report_shift/:contractor_date", authUser, (req, res) => {
		var data = req.params.contractor_date
		data = data.split("_")
		var contractor_id = data[0]
		var date = data[1]
		date = date.split(".")
		date = date.join("/")
		var rec_id = null
		var start = ""
		var end = ""

		var db = client.db("contractor-workers")
		var db_collection = db.collection("contractorWorkers")
		db_collection.find({ "id": contractor_id }).toArray(function (err, allDetails) {
			if (err) {
				console.log(err)
			}
			else {
				// Find the recrutier that's hired him for this job
				var con_shifts = allDetails[0].shifts
				for (var i = 0; i < con_shifts.length; ++i) {
					if (con_shifts[i][0] == date) {
						rec_id = con_shifts[i][3]
						start = con_shifts[i][1]
						end = con_shifts[i][2]
						res.render("report_shift", { "con_id": contractor_id, "rec_id": rec_id, "date": date, "start": start, "end": end })
						break
					}
				}
			}
		})
	})

	app.get("/search_contractor_worker", authUser, authRole("Company Worker"), (req, res) => {
		var db = client.db("contractor-workers")
		var db_collection = db.collection("contractorWorkers")

		db_collection.find().toArray(function (err, allDetails) {
			if (err) {
				console.log(err)
			}
			else {
				res.render("search_contractor_worker", { details: allDetails })
			}
		})
	})

	app.get("/delete/:id", authUser, authRole("Company Worker"), (req, res) => {
		// Connect contractor workers db and collection
		var db = client.db("contractor-workers")
		var db_collection = db.collection("contractorWorkers")
		var myquery = { id: req.params.id }

		if (db_collection) {
			// Deleting contractor worker from collection contractorWorkers
			db_collection.deleteOne(myquery, function (err, obj) {
				if (err) throw err
				return obj
			})
			res.redirect("/search_contractor_worker")
		}

		db_collection = db.collection("contractorWorkersLogin")
		if (db_collection) {
			// Deleting contractor worker from collection contractorWorkersLogin
			db_collection.deleteOne(myquery, function (err, obj) {
				if (err) throw err
				return obj
			})
		}
	})

	app.get("/contractor_worker_my_profile", authUser, authRole("Contractor Worker"), (req, res) => {
		// Connect contractor workers db and collection
		var db = client.db("contractor-workers")
		var db_collection = db.collection("contractorWorkers")
		db_collection.find({ "id": req.session.user.id }).toArray(function (err, allDetails) {
			if (err) {
				console.log(err)
			}
			else {
				res.render("contractor_worker_my_profile", { details: allDetails })
			}
		})
	})

	app.get("/hire_contractor/:id", (req, res) => {
		res.render("hire_contractor", { "id": req.params.id, "msg": null })
	})

	app.get("/hire_history", (req, res) => {
		var db = client.db("employers-workers")
		var db_collection = db.collection("employersWorkers")

		db_collection.find({ "id": req.session.user.id }).toArray(function (err, allDetails) {
			if (err) {
				console.log(err)
			}
			else {
				var waiting_requests = allDetails[0].job_requests
				var approved_requests = allDetails[0].hiring
				var canceled_requests = allDetails[0].canceled_jobs
				var all_job_requests = waiting_requests.concat(approved_requests, canceled_requests)
				res.render("employee_hiring_history", { details: all_job_requests })
			}
		})
	})

	// POST functions
	app.post("/add_note_calendar", (req, res) => {
		var date = req.body.d
		var title = req.body.t
		var dec = req.body.e
		console.log(res)
		var db = client.db("contractor-workers")
		var db_collection = db.collection("contractorWorkers")
		db_collection.updateOne({ "id": req.session.user.id }, { $push: { not_able_to_work: [date, title, dec] } })
		console.log(date, title, dec)
	})

	app.post("/delete_note_calendar", (req, res) => {
		var date = req.body.d
		var title = req.body.t
		var dec = req.body.e
		console.log(res)
		var db = client.db("contractor-workers")
		var db_collection = db.collection("contractorWorkers")
		db_collection.updateOne({ "id": req.session.user.id }, { $pull: { not_able_to_work: [date, title, dec] } })
		console.log("Deleted note", date, title, dec)
	})

	app.post("/auth", (req, res) => {
		var user_name = req.body.Email_Address
		var passwordd = req.body.pass
		var userType = req.body.user_type
		var homepage_name = null
		var db_collection = null
		var db = null
		var type = null

		switch (userType) {
		case "Company Worker":
			db = client.db("human-resources-workers")
			db_collection = db.collection("humanResourcsesWorkersLogin")
			homepage_name = "CompanyWorkerHomepage"
			type = "Company Worker"
			break
		case "Contractor Worker":
			db = client.db("contractor-workers")
			db_collection = db.collection("contractorWorkersLogin")
			homepage_name = "contractor_worker_home_page"
			type = "Contractor Worker"
			break
		case "Employee":
			db = client.db("employers-workers")
			db_collection = db.collection("employersWorkersLogin")
			homepage_name = "recruiters_home_page"
			type = "Recruiter"
			break
		}
		
		if (db_collection) {
			db_collection.find({ "user": user_name, "password": passwordd }).toArray(function (err, users) {
				if (users.length == 1) {
					req.session.user = {
						"id": users[0].id,
						"type": type,
						"fullname":users[0].full_name
					}
				
					res.redirect("/" + homepage_name)
				}

				else {
					console.log("User Not Exist! \n")
					res.redirect("/Login")
				}
			})
		}
		else { res.redirect("/Login") }
	})

	app.post("/add_contractor", (req, res) => {
		var db = client.db("contractor-workers")
		var db_collection = db.collection("contractorWorkers")
		var contractor_id = req.body.id
		var first_name = req.body.first_name
		var last_name = req.body.last_name
		var hourly_pay = req.body.hourly_pay
		var city = req.body.city
		var home = req.body.home
		var phone_number = req.body.phone_number
		var email = req.body.email
		var gender = req.body.radio
		var skills = req.body.skills
		var username = first_name + "_" + last_name + "@contractor.sce"
		var password = (Math.floor(1000000 + Math.random() * 9000000)).toString()
		var data = null

		if (db_collection) {
			// Check if the id belongs to another user
			db_collection.find({ "id": contractor_id }).count().then(function (numItems) {
				console.log(numItems)
				if (numItems) {
					console.log("There is an existing user with this ID, please try to restore your password if you already have a user")

					res.redirect("/add_new_contractor_worker")
				}
				// If there is not a user with that ID
				else {
					// Check if the user name is already taken
					db_collection.find({ "first_name": first_name, "last_name": last_name }).count().then(function (numItems) {
						console.log(numItems)
						if (numItems) {
							username = first_name + "_" + last_name + numItems + "@contractor.sce"
						}
						data = {
							"id": contractor_id,
							"first_name": first_name,
							"last_name": last_name,
							"hourly_pay": hourly_pay,
							"city": city,
							"home": home,
							"phone_number": phone_number,
							"email": email,
							"gender": gender,
							"skills": skills,
							"user": username,
							"password": password,
							"not_able_to_work": [],
							"hiring": [],
							"ratings": [],
							"shifts": [],
							"job_requests": [],
							"canceled_jobs": [],
							"work_history": [],
							"average_rate":[],
							"number_of_rates":[]
						}
						// Add a new contractor worker to "contractorWorkers" collection with all of his information
						db_collection.insertOne(data, function (err, collection) {
							if (err) {
								throw err
							}
							console.log("Record inserted Successfully" + collection.insertedCount)
							// Send an email to the new contractor with his username and password
							var message = "Welcome " + first_name + " " + last_name + "!\nWe are happy that you chose to be a contractor worker in our company."
							message = message + "\nYour login information is:\nUsername: " + username + "\nPassword: " + password + "\n\nHope you will enjoy our site!"
							send_an_email(email, "Welcome to SCE Contractor!", message)
						})
					})
					// Add a new contractor worker to "contractorWorkersLogin" db with his username and password only
					var db_collection_login = db.collection("contractorWorkersLogin")
					data = {
						"id": contractor_id,
						"user": username,
						"full_name": first_name + " " + last_name,
						"password": password
					}
					db_collection_login.insertOne(data, function (err, collection) {
						if (err) {
							throw err
						}
						console.log("Record inserted Successfully" + collection.insertedCount)
					})
					res.redirect("/CompanyWorkerHomepage")
				}
			})

		}
	})

	app.post("/Register_New_Employee", (req, res) => {
		var db = client.db("employers-workers")
		var db_collection = db.collection("employersWorkers")
		var id = req.body.id
		var first_name = req.body.first_name
		var last_name = req.body.last_name
		var gender = req.body.radio
		var email = req.body.email
		var phone_number = req.body.phone
		var company_name = req.body.companyName
		var username = first_name + "_" + last_name + "@" + company_name + ".sce"
		var password = (Math.floor(1000000 + Math.random() * 9000000)).toString()
		var data = null
		// Check if the user name is already taken
		if (db_collection) {
			db_collection.find({ "first_name": first_name, "last_name": last_name }).count().then(function (numItems) {
				console.log(numItems)
				if (numItems) {
					username = first_name + "_" + last_name + numItems + "@" + company_name + ".sce"
				}
				data = {
					"id": id,
					"first_name": first_name,
					"last_name": last_name,
					"gender": gender,
					"email": email,
					"phone_number": phone_number,
					"company_name": company_name,
					"user": username,
					"password": password,
					"hiring": [],
					"job_requests": [],
					"work_history": [],
					"canceled_jobs": []
				}
				// Add a new employee to "employersWorkers" collection with all of his information
				db_collection.insertOne(data, function (err, collection) {
					if (err) {
						throw err
					}
					console.log("Record inserted Successfully" + collection.insertedCount)

					// Send an email to the new employee with his username and password
					var message = "Welcome " + first_name + " " + last_name + "!\nWe are happy that you chose to work with our company."
					message = message + "\nYour login information is:\nUsername: " + username + "\nPassword: " + password + "\n\nHope you will enjoy our site!"
					send_an_email(email, "Welcome to SCE Contractor!", message)
				})

			})
		}
		var db_collection_login = db.collection("employersWorkersLogin")
		data = {
			"user": username,
			"full_name": first_name + " " + last_name,
			"password": password
		}
		db_collection_login.insertOne(data, function (err, collection) {
			if (err) {
				throw err
			}
			console.log("Record inserted Successfully" + collection.insertedCount)
		})
		res.redirect("/Login")
	})


	// POST function for search in a human resources pages
	app.post("/filter_search", (req, res) => {
		var skill = req.body.skill
		var hourly_pay = req.body.hourly_pay
		var city = req.body.city
		// Connect contractor workers db and collection
		var db = client.db("contractor-workers")
		var db_collection = db.collection("contractorWorkers")

		if (db_collection) {
			// If the company worker didn't filled any of the filed then show all of the exsiting contractor workers
			if (skill == "" && hourly_pay == "" && city == "") {
				db_collection.find().toArray(function (err, allDetails) {
					if (err) {
						console.log(err)
					}
					else {
						res.render("search_contractor_worker", { details: allDetails })
					}
				})
			}
			// If the company worker filled all 3 criterions then search all the contractor workers that fits
			else if (skill && hourly_pay && city) {
				db_collection.find({ "skills": skill, "hourly_pay": hourly_pay, "city": city }).toArray(function (err, allDetails) {
					if (err) {
						console.log(err)
					}
					else {
						res.render("search_contractor_worker", { details: allDetails })
					}
				})
			}
			else if (skill && hourly_pay) {
				db_collection.find({ "skills": skill, "hourly_pay": hourly_pay }).toArray(function (err, allDetails) {
					if (err) {
						console.log(err)
					}
					else {
						res.render("search_contractor_worker", { details: allDetails })
					}
				})
			}
			else if (skill && city) {
				db_collection.find({ "skills": skill, "city": city }).toArray(function (err, allDetails) {
					if (err) {
						console.log(err)
					}
					else {
						res.render("search_contractor_worker", { details: allDetails })
					}
				})
			}
			else if (hourly_pay && city) {
				db_collection.find({ "hourly_pay": hourly_pay, "city": city }).toArray(function (err, allDetails) {
					if (err) {
						console.log(err)
					}
					else {
						res.render("search_contractor_worker", { details: allDetails })
					}
				})
			}
			else if (skill) {
				db_collection.find({ "skills": skill }).toArray(function (err, allDetails) {
					if (err) {
						console.log(err)
					}
					else {
						res.render("search_contractor_worker", { details: allDetails })
					}
				})
			}
			else if (hourly_pay) {
				db_collection.find({ "hourly_pay": hourly_pay }).toArray(function (err, allDetails) {
					if (err) {
						console.log(err)
					}
					else {
						res.render("search_contractor_worker", { details: allDetails })
					}
				})
			}
			else if (city) {
				db_collection.find({ "city": city }).toArray(function (err, allDetails) {
					if (err) {
						console.log(err)
					}
					else {
						res.render("search_contractor_worker", { details: allDetails })
					}
				})
			}
			else {
				res.render("search_contractor_worker", { details: null })
			}

		}
	})

	app.post("/filter_monitor_hiring", (req, res) => {
		var recrutier_id = req.body.recrutier_id
		var contractor_name = req.body.contractor_name
		var date = req.body.date
		// Connect contractor workers db and collection
		var db = client.db("contractor-workers")
		var db_collection = db.collection("contractorWorkers")

		if (db_collection) {
			db_collection.find().toArray(function (err, allDetails) {
				if (err) {
					console.log(err)
				}
				else {
					var all_hiring = []
					var i = 0
					for (i = 0; i < allDetails.length; ++i) {
						var contractor_hirings = allDetails[i].hiring
						for (var j = 0; j < contractor_hirings.length; ++j) {
							var one_hire = {
								"contractor_id": allDetails[i].id,
								"full_name": allDetails[i].first_name + " " + allDetails[i].last_name,
								"date": contractor_hirings[j][0],
								"start": contractor_hirings[j][1],
								"end": contractor_hirings[j][2],
								"recrutier_id": contractor_hirings[j][3]
							}
							all_hiring.push(one_hire)
						}
					}
					// If the company worker didn't filled any of the filed then show all of the exsiting contractor workers
					if (recrutier_id != "") {
						for (i = all_hiring.length; i > 0; --i) {
							if (all_hiring[i - 1].recrutier_id != recrutier_id) {
								all_hiring.splice(i - 1, 1)
							}
						}

					}
					if (contractor_name != "") {
						for (i = all_hiring.length; i > 0; --i) {
							if (all_hiring[i - 1].full_name != contractor_name) {
								all_hiring.splice(i - 1, 1)
							}
						}
					}
					if (date != "") {
						for (i = all_hiring.length; i > 0; --i) {
							if (all_hiring[i - 1].date != date) {
								all_hiring.splice(i - 1, 1)
							}
						}

					}
					res.render("monitor_of_all_hires", { details: all_hiring })
				}
			})

		}
	})

	app.post("/filter_search_by_recruiter", (req, res) => {
		var skill = req.body.skill
		var hourly_pay = req.body.hourly_pay
		var city = req.body.city
		// Connect contractor workers db and collection
		var db = client.db("contractor-workers")
		var db_collection = db.collection("contractorWorkers")

		if (db_collection) {
			if (skill == "" && hourly_pay == "" && city == "") {
				db_collection.find().toArray(function (err, allDetails) {
					if (err) {
						console.log(err)
					}
					else {
						res.render("search_contractor_worker", { details: allDetails })
					}
				})
			}
			// If the recruiter filled all 3 criterions then search all the contractor workers that fits
			else if (skill && hourly_pay && city) {
				db_collection.find({ "skills": skill, "hourly_pay": hourly_pay, "city": city }).toArray(function (err, allDetails) {
					if (err) {
						console.log(err)
					}
					else {
						res.render("search_contractor_worker", { details: allDetails })
					}
				})
			}
			else if (skill && hourly_pay) {
				db_collection.find({ "skills": skill, "hourly_pay": hourly_pay }).toArray(function (err, allDetails) {
					if (err) {
						console.log(err)
					}
					else {
						res.render("search_contractor_worker", { details: allDetails })
					}
				})
			}
			else if (skill && city) {
				db_collection.find({ "skills": skill, "city": city }).toArray(function (err, allDetails) {
					if (err) {
						console.log(err)
					}
					else {
						res.render("search_contractor_worker", { details: allDetails })
					}
				})
			}
			else if (hourly_pay && city) {
				db_collection.find({ "hourly_pay": hourly_pay, "city": city }).toArray(function (err, allDetails) {
					if (err) {
						console.log(err)
					}
					else {
						res.render("search_contractor_worker", { details: allDetails })
					}
				})
			}
			else if (skill) {
				db_collection.find({ "skills": skill }).toArray(function (err, allDetails) {
					if (err) {
						console.log(err)
					}
					else {
						res.render("search_contractor_worker", { details: allDetails })
					}
				})
			}
			else if (hourly_pay) {
				db_collection.find({ "hourly_pay": hourly_pay }).toArray(function (err, allDetails) {
					if (err) {
						console.log(err)
					}
					else {
						res.render("search_contractor_worker", { details: allDetails })
					}
				})
			}
			else if (city) {
				db_collection.find({ "city": city }).toArray(function (err, allDetails) {
					if (err) {
						console.log(err)
					}
					else {
						res.render("search_contractor_worker", { details: allDetails })
					}
				})
			}
			else {
				res.render("search_contractor_worker", { details: null })
			}

		}
	})

	app.post("/filter_hiring_history", (req, res) => {
		var status = req.body.status
		var contractor_id = req.body.contractor_id
		var date = req.body.date
		// Connect contractor workers db and collection
		var db = client.db("employers-workers")
		var db_collection = db.collection("employersWorkers")

		if (db_collection) {
			db_collection.find({"id": req.session.user.id}).toArray(function (err, allDetails) {
				if (err) {
					console.log(err)
				}
				else {
					var waiting_requests = allDetails[0].job_requests
					var approved_requests = allDetails[0].hiring
					var canceled_requests = allDetails[0].canceled_jobs
					var all_job_requests = waiting_requests.concat(approved_requests, canceled_requests)
					var filtered_requests = []
					var i = 0
					// If the employee didn't filled any of the filed then show all of the exsiting contractor workers
					if (status == "" && contractor_id == "" && date == "") {
						res.render("employee_hiring_history", { details: all_job_requests })	
					}
					// If the company worker filled all 3 criterions then search all the contractor workers that fits
					else if (status && contractor_id && date) {
						for(i = 0; i<all_job_requests.length; ++i){
							if(all_job_requests[i][0] == date && all_job_requests[i][4] == status && all_job_requests[i][3] == contractor_id) {
								filtered_requests.push(all_job_requests[i])
							}
						}
						res.render("employee_hiring_history", { details: filtered_requests })
					}
					else if (status && contractor_id) {
						for(i = 0; i<all_job_requests.length; ++i){
							if(all_job_requests[i][4] == status && all_job_requests[i][3] == contractor_id) {
								filtered_requests.push(all_job_requests[i])
							}
						}
						res.render("employee_hiring_history", { details: filtered_requests })
					}
					else if (status && date) {
						for(i = 0; i<all_job_requests.length; ++i){
							if(all_job_requests[i][0] == date && all_job_requests[i][4] == status) {
								filtered_requests.push(all_job_requests[i])
							}
						}
						res.render("employee_hiring_history", { details: filtered_requests })
					}
					else if (contractor_id && date) {
						for(i = 0; i<all_job_requests.length; ++i){
							if(all_job_requests[i][0] == date && all_job_requests[i][3] == contractor_id) {
								filtered_requests.push(all_job_requests[i])
							}
						}
						res.render("employee_hiring_history", { details: filtered_requests })
					}
					else if (status) {
						for(i = 0; i<all_job_requests.length; ++i){
							if(all_job_requests[i][4] == status) {
								filtered_requests.push(all_job_requests[i])
							}
						}
						res.render("employee_hiring_history", { details: filtered_requests })
					}
					else if (contractor_id) {
						for(i = 0; i<all_job_requests.length; ++i){
							if(all_job_requests[i][3] == contractor_id) {
								filtered_requests.push(all_job_requests[i])
							}
						}
						res.render("employee_hiring_history", { details: filtered_requests })
					}
					else if (date) {
						for(i = 0; i<all_job_requests.length; ++i){
							if(all_job_requests[i][0] == date) {
								filtered_requests.push(all_job_requests[i])
							}
						}
						res.render("employee_hiring_history", { details: filtered_requests })
					}
					else {
						res.render("employee_hiring_history", { details: null })
					}
				
				}
			})
			
			
		}
	})

	app.post("/hire", (req, res) => {
		var id_of_contractor = req.body.contractor_id
		var id_of_recruiter = req.session.user.id
		var date = req.body.date_of_hire
		var start = req.body.Start_work
		var end = req.body.end_work


		var db = client.db("contractor-workers")
		var db_collection = db.collection("contractorWorkers")
		if (db_collection) {
			db_collection.find({ "id": id_of_contractor }).toArray(function (err, allDetails) {
				if (err) {
					console.log(err)
				}
				else {
					try {
						var day
						var temp = allDetails[0].not_able_to_work
						for (day of temp) {
							day = day[0]
							var day_arr = day.split("/")
							if(day_arr[0].length == 1){
								day_arr[0] = "0" + day_arr[0]
							}
							day = day_arr.join("/")
							if (day == date) {
								console.log("Cant' hire in this day!")
								res.render("hire_contractor", {"id": id_of_contractor, "msg": "Cant' hire in this day! he isn't work on this date."})
								return
							}
						}

						var job
						var contractor_hiring = allDetails[0].hiring
						for (job of contractor_hiring) {
							day = job[0]
							day_arr = day.split("/")
							if(day_arr[0].length == 1){
								day_arr[0] = "0" + day_arr[0]
							}
							day = day_arr.join("/")
							if (day == date) {
								console.log("Cant hire twice a contractor on the same day!\n")
								res.render("hire_contractor", {"id": id_of_contractor, "msg": "The contractor already booked in this day. Cant hire twice a contractor on the same day!\n"})
								return
							}
						}

						db_collection.updateOne({ "id": id_of_contractor }, { $push: { job_requests: [date, start, end, id_of_recruiter, "Waiting for approval"] } })

						db = client.db("employers-workers")
						db_collection = db.collection("employersWorkers")
						db_collection.updateOne({ "id": id_of_recruiter }, { $push: { job_requests: [date, start, end, id_of_contractor, "Waiting for approval"] } })
						res.redirect("/recruiters_home_page")
					} catch (error) {
						console.log("Ad matay????")
					}
				}
			})
		}
	})

	app.post("/filter_work_history", (req, res) => {
		var month = req.body.month
		var company_name = req.body.company_name
		var recrutier_id = req.body.recrutier_id
		
		// Connect contractor workers db and collection
		var db = client.db("contractor-workers")
		var db_collection = db.collection("contractorWorkers")

		if (db_collection) {
			db_collection.find({ "id": req.session.user.id }).toArray(function (err, allDetails) {
				if (err) {
					console.log(err)
				}
				else {
					var filter_work_history = []
					var total_pay_in_month = 0
					var total_hours_in_month = 0
					var total_minutes_in_month = 0
					var hours_in_minutes = 0
					var i = 0
					var shift = null
					var shift_month = null
					var total = 0

					var full_name = allDetails[0].first_name + " " + allDetails[0].last_name
					if ((month == "" || month == "0") && company_name == "" && recrutier_id == "") {
						res.render("contractor_work_history", { "type": "Contractor Worker", "full_name": full_name, "work_history": allDetails[0].work_history, "total_pay": null, "total_hours_for_month": null, "total_minutes_for_month": null})
					}
					else if((month != "0" && month != "") && company_name && recrutier_id) {
						for(i=0; i<allDetails[0].work_history.length; ++i){
							shift = allDetails[0].work_history[i]
							shift_month = (shift[0].split("/"))[0]
							if(shift_month.charAt(0) == 0){
								shift_month = shift_month.substring(1)
							}
							if(shift_month == month && company_name == shift[4] && recrutier_id == shift[3]){
								filter_work_history.push(shift)
								total_pay_in_month = total_pay_in_month + totalPayForShift(shift[1], shift[2], allDetails[0].hourly_pay)
								total = totalTimeForShift(shift[1], shift[2])
								total_hours_in_month += total[0]
								total_minutes_in_month += total[1]
							}
						}
						hours_in_minutes = parseInt(total_minutes_in_month / 60, 10)
						total_hours_in_month = total_hours_in_month + hours_in_minutes
						total_minutes_in_month = total_minutes_in_month - hours_in_minutes * 60
						res.render("contractor_work_history", { "type": "Contractor Worker", "full_name": full_name, "work_history": filter_work_history, "total_pay": total_pay_in_month, "total_hours_for_month": total_hours_in_month, "total_minutes_for_month": total_minutes_in_month})

					}
					else if((month != "0" && month != "") && company_name) {
						for(i=0; i<allDetails[0].work_history.length; ++i){
							shift = allDetails[0].work_history[i]
							shift_month = (shift[0].split("/"))[0]
							if(shift_month.charAt(0) == 0){
								shift_month = shift_month.substring(1)
							}
							if(shift_month == month && company_name == shift[4]){
								filter_work_history.push(shift)
								total_pay_in_month = total_pay_in_month + totalPayForShift(shift[1], shift[2], allDetails[0].hourly_pay)
								total = totalTimeForShift(shift[1], shift[2])
								total_hours_in_month += total[0]
								total_minutes_in_month += total[1]
							}
						}
						hours_in_minutes = parseInt(total_minutes_in_month / 60, 10)
						total_hours_in_month = total_hours_in_month + hours_in_minutes
						total_minutes_in_month = total_minutes_in_month - hours_in_minutes * 60
						res.render("contractor_work_history", { "type": "Contractor Worker", "full_name": full_name, "work_history": filter_work_history, "total_pay": total_pay_in_month, "total_hours_for_month": total_hours_in_month, "total_minutes_for_month": total_minutes_in_month})
					}
					else if((month != "0" && month != "") && recrutier_id) {
						for(i=0; i<allDetails[0].work_history.length; ++i){
							shift = allDetails[0].work_history[i]
							shift_month = (shift[0].split("/"))[0]
							if(shift_month.charAt(0) == 0){
								shift_month = shift_month.substring(1)
							}
							if(shift_month == month && recrutier_id == shift[3]){
								filter_work_history.push(shift)
								total_pay_in_month = total_pay_in_month + totalPayForShift(shift[1], shift[2], allDetails[0].hourly_pay)
								total = totalTimeForShift(shift[1], shift[2])
								total_hours_in_month += total[0]
								total_minutes_in_month += total[1]
							}
						}
						hours_in_minutes = parseInt(total_minutes_in_month / 60, 10)
						total_hours_in_month = total_hours_in_month + hours_in_minutes
						total_minutes_in_month = total_minutes_in_month - hours_in_minutes * 60
						res.render("contractor_work_history", { "type": "Contractor Worker", "full_name": full_name, "work_history": filter_work_history, "total_pay": total_pay_in_month, "total_hours_for_month": total_hours_in_month, "total_minutes_for_month": total_minutes_in_month})
					}
					else if(company_name && recrutier_id) {
						for(i=0; i<allDetails[0].work_history.length; ++i){
							shift = allDetails[0].work_history[i]
							
							if(company_name == shift[4] && recrutier_id == shift[3]){
								filter_work_history.push(shift)
							}
						}
						res.render("contractor_work_history", { "type": "Contractor Worker", "full_name": full_name, "work_history": filter_work_history, "total_pay": null, "total_hours_for_month": null, "total_minutes_for_month": null})
					}
					else if((month != "0" && month != "")) {
						for(i=0; i<allDetails[0].work_history.length; ++i){
							shift = allDetails[0].work_history[i]
							shift_month = (shift[0].split("/"))[0]
							if(shift_month.charAt(0) == 0){
								shift_month = shift_month.substring(1)
							}
							if(shift_month == month){
								filter_work_history.push(shift)
								total_pay_in_month = total_pay_in_month + totalPayForShift(shift[1], shift[2], allDetails[0].hourly_pay)
								total = totalTimeForShift(shift[1], shift[2])
								total_hours_in_month += total[0]
								total_minutes_in_month += total[1]
							}
						}
						hours_in_minutes = parseInt(total_minutes_in_month / 60, 10)
						total_hours_in_month = total_hours_in_month + hours_in_minutes
						total_minutes_in_month = total_minutes_in_month - hours_in_minutes * 60
						res.render("contractor_work_history", { "type": "Contractor Worker", "full_name": full_name, "work_history": filter_work_history, "total_pay": total_pay_in_month, "total_hours_for_month": total_hours_in_month, "total_minutes_for_month": total_minutes_in_month})
					}
					else if(company_name) {
						for(i=0; i<allDetails[0].work_history.length; ++i){
							shift = allDetails[0].work_history[i]
							
							if(company_name == shift[4]){
								filter_work_history.push(shift)
							}
						}
						res.render("contractor_work_history", { "type": "Contractor Worker", "full_name": full_name, "work_history": filter_work_history, "total_pay": null, "total_hours_for_month": null, "total_minutes_for_month": null})
					}
					else if(recrutier_id) {
						for(i=0; i<allDetails[0].work_history.length; ++i){
							shift = allDetails[0].work_history[i]
							
							if(recrutier_id == shift[3]){
								filter_work_history.push(shift)
							}
						}
						res.render("contractor_work_history", { "type": "Contractor Worker", "full_name": full_name, "work_history": filter_work_history, "total_pay": null, "total_hours_for_month": null, "total_minutes_for_month": null})
					}
					else{
						res.render("contractor_work_history", { "type": "Contractor Worker", "full_name": full_name, "work_history": null, "total_pay": null, "total_hours_for_month": null, "total_minutes_for_month": null})
					}
					
				}
			})
			// If the company worker didn't filled any of the filed then show all of the exsiting contractor workers
			if (month == "" && company_name == "" && recrutier_id == "") {
				db_collection.find({ "id": req.session.user.id }).toArray(function (err, allDetails) {
					if (err) {
						console.log(err)
					}
					else {
						var full_name = allDetails[0].first_name + " " + allDetails[0].last_name
						res.render("contractor_work_history", { "type": "Contractor Worker", "full_name": full_name, "work_history": allDetails[0].work_history, "total_pay": null, "total_hours_for_month": null, "total_minutes_for_month": null})
					}
				})
			}
			
			
			

		}
	})

	app.post("/add_new_shift", (req, res) => {
		var db = client.db("contractor-workers")
		var db_collection = db.collection("contractorWorkers")
		var date = req.body.date_of_shift
		var start_work = req.body.start_work
		var end_work = req.body.end_work
		var rec_id = req.body.rec_id
		db_collection.updateOne({ "id": req.session.user.id }, { $push: { shifts: [date, start_work, end_work, rec_id] } })
		res.redirect("/contractor_shifts")
	})

	app.post("/save_new_contractor_information", (req, res) => {
		var enter_contractor_id = req.body.contractor_id
		var enter_first_name = req.body.first_name
		var enter_last_name = req.body.last_name
		var enter_city = req.body.city
		var enter_home_address = req.body.home_address
		var enter_phone = req.body.phone
		var enter_email = req.body.email

		var db = client.db("contractor-workers")
		var db_collection = db.collection("contractorWorkers")
		if (db_collection) {
			db_collection.updateOne({ "id": enter_contractor_id }, {
				$set:
				{
					first_name: enter_first_name,
					last_name: enter_last_name,
					city: enter_city,
					home: enter_home_address,
					phone_number: enter_phone,
					email: enter_email,
				}
			})
			if (req.session.user.type == "Contractor Worker") {
				res.redirect("/contractor_worker_my_profile")
			}
			else {
				res.redirect("/contractor_worker_profile/" + enter_contractor_id)
			}
		}
		else {
			if (req.session.user.type == "Contractor Worker") {
				res.redirect("/contractor_worker_my_profile")
			}
			else {
				res.redirect("/contractor_worker_profile/" + enter_contractor_id)
			}
		}
	})

	app.post("/save_new_shift", (req, res) => {
		var shift_date = req.body.hiddenDate
		var start_hire = req.body.start_work
		var end_hire = req.body.end_work
		var rec_id = req.body.hiddenID

		var db = client.db("contractor-workers")
		var db_collection = db.collection("contractorWorkers")
		db_collection.find({ "id": req.session.user.id }).toArray(function (err, allDetails) {
			if (err) {
				console.log(err)
			}
			else {
				var shifts = allDetails[0].shifts
				var old_start = null
				var old_end = null
				for (var i = 0; i < shifts.length; ++i) {
					if (shifts[i][0] == shift_date) {
						old_start = shifts[i][1]
						old_end = shifts[i][2]
						break
					}
				}
				db_collection.updateOne({ "id": req.session.user.id, "shifts": { $in: [[shift_date, old_start, old_end, rec_id]] } }, { $set: { "shifts.$": [shift_date, start_hire, end_hire, rec_id] } })
				res.redirect("/contractor_shifts")
			}
		})
	})

	app.post("/add_note_calendar", (req, res) => {
		var date = req.body.d
		var title = req.body.t
		var dec = req.body.e
		var db = client.db("contractor-workers")
		var db_collection = db.collection("contractorWorkers")
		if (title == "Work Day") {
			var det = dec.split("\n")
			var start_work = det[0]
			var end_work = det[1]
			var rec_id = det[2]
			db_collection.updateOne({ "id": req.session.user.id }, { $push: { shifts: [date, start_work, end_work, rec_id] } })
			res.render("contractor_worker_home_page",{name:req.session.user.fullname})
		}
		else {
			db_collection.updateOne({ "id": req.session.user.id }, { $push: { not_able_to_work: [date, title, dec] } })
			res.render("contractor_worker_home_page",{name:req.session.user.fullname})
		}
	})

	app.post("/delete_note_calendar", (req, res) => {
		var date = req.body.d
		var title = req.body.t
		var dec = req.body.e
		var db = client.db("contractor-workers")
		var db_collection = db.collection("contractorWorkers")
		if (title == "Work Day") {
			var det = dec.split("\n")
			var start_work = det[0]
			var end_work = det[1]
			var rec_id = det[2]
			db_collection.updateOne({ "id": req.session.user.id }, { $pull: { shifts: [date, start_work, end_work, rec_id] } })
			res.render("contractor_worker_home_page",{name:req.session.user.fullname})
		}
		else {
			db_collection.updateOne({ "id": req.session.user.id }, { $pull: { not_able_to_work: [date, title, dec] } })
			res.render("contractor_worker_home_page",{name:req.session.user.fullname})
		}
	})

	app.post("/get_my_password", (req, res) => {
		// Get the email
		var email = req.body.email
		
		// Check if it's exsits in our db
		var db = client.db("contractor-workers")
		var db_collection = db.collection("contractorWorkers")
		db_collection.find({ "email": email }).toArray(function (err, allDetails) {
			if(allDetails.length > 0) {
				var full_name = allDetails[0].first_name + " " + allDetails[0].last_name
				var password = allDetails[0].password
				var msg = "Hey " + full_name + ",\nWe got a request for retriving your password.\nYour password is: " + password + "\n\nHave a nice day!"
				send_an_email(email, "Forgot Password", msg)
			}
		})
		db = client.db("employers-workers")
		db_collection = db.collection("employersWorkers")
		db_collection.find({ "email": email }).toArray(function (err, allDetails) {
			if(allDetails.length > 0) {
				var full_name = allDetails[0].first_name + " " + allDetails[0].last_name
				var password = allDetails[0].password
				var msg = "Hey " + full_name + ",\nWe got a request for retriving your password.\nYour password is: " + password + "\n\nHave a nice day!"
				send_an_email(email, "Forgot Password", msg)
			}
		})
		db = client.db("human-resources-workers")
		db_collection = db.collection("humanResourcsesWorkersLogin")
		db_collection.find({ "email": email }).toArray(function (err, allDetails) {
			if(allDetails.length > 0) {
				var full_name = allDetails[0].first_name + " " + allDetails[0].last_name
				var password = allDetails[0].password
				var msg = "Hey " + full_name + ",\nWe got a request for retriving your password.\nYour password is: " + password + "\n\nHave a nice day!"
				send_an_email(email, "Forgot Password", msg)
			}
		})

		res.redirect("/Login")
	})

	app.post("/get_my_username", (req, res) => {
		// Get the email
		var email = req.body.email
		
		// Check if it's exsits in our db
		var db = client.db("contractor-workers")
		var db_collection = db.collection("contractorWorkers")
		db_collection.find({ "email": email }).toArray(function (err, allDetails) {
			if(allDetails.length > 0) {
				var full_name = allDetails[0].first_name + " " + allDetails[0].last_name
				var username = allDetails[0].user
				var msg = "Hey " + full_name + ",\nWe got a request for retriving your username.\nYour username is: " + username + "\n\nHave a nice day!"
				send_an_email(email, "Forgot Username", msg)
			}
		})
		db = client.db("employers-workers")
		db_collection = db.collection("employersWorkers")
		db_collection.find({ "email": email }).toArray(function (err, allDetails) {
			if(allDetails.length > 0) {
				var full_name = allDetails[0].first_name + " " + allDetails[0].last_name
				var username = allDetails[0].user
				var msg = "Hey " + full_name + ",\nWe got a request for retriving your username.\nYour username is: " + username + "\n\nHave a nice day!"
				send_an_email(email, "Forgot Username", msg)
			}
		})
		db = client.db("human-resources-workers")
		db_collection = db.collection("humanResourcsesWorkersLogin")
		db_collection.find({ "email": email }).toArray(function (err, allDetails) {
			if(allDetails.length > 0) {
				var full_name = allDetails[0].first_name + " " + allDetails[0].last_name
				var username = allDetails[0].user
				var msg = "Hey " + full_name + ",\nWe got a request for retriving your username.\nYour username is: " + username + "\n\nHave a nice day!"
				send_an_email(email, "Forgot Username", msg)
			}
		})

		res.redirect("/Login")
	})

	app.post("/report", (req, res) => {
		var contractor_id = req.body.contractor_id
		var date = req.body.date_hire
		var recrutier_id = req.body.recrutier_id
		var start = req.body.start_work
		var end = req.body.end_work
		var report_input = req.body.report_input


		// Find contractor email address
		var db = client.db("contractor-workers")
		var db_collection = db.collection("contractorWorkers")
		db_collection.find({ "id": contractor_id }).toArray(function (err, allDetails) {
			if (err) {
				console.log(err)
			}
			else {
				var name = allDetails[0].first_name
				var message = "Hello " + name + ",\n" + "You got a report on a shift you entered.\nShift information:\nDate: "
				message = message + date + "\nStart Hour:" + start + "\nEnd Hour: " + end + "\nRecurtier ID: " + recrutier_id
				message = message + "\nThe report message: " + report_input + "\nPlease fix it as soon as possible.\nThank you in advance."
				var contractor_email = allDetails[0].email
				var subject = "Report on a shift you entered"
				send_an_email(contractor_email, subject, message)
				res.redirect("/shifts_monitor")
			}
		})
	})

	app.post("/view_contractor_shifts", (req, res) => {
		var contractor_id = req.body.contractor_id
		res.redirect("/view_a_contractor_shifts/" + contractor_id)
	})

	app.post("/view_contractor_work_history", (req, res) => {
		var contractor_id = req.body.contractor_id_history
		res.redirect("/view_contractor_worker_work_history/" + contractor_id)
	})

	app.post("/make_statistics", (req, res) => {
		var shifts_confirmed = req.body.shifts_confirmed
		var shifts_waiting = req.body.shifts_waiting
		var jobs_waiting = req.body.jobs_waiting
		var jobs_decliend = req.body.jobs_decliend
		var count_v = 0
		if(shifts_confirmed){++count_v}
		if(shifts_waiting){++count_v}
		if(jobs_waiting){++count_v}
		if(jobs_decliend){++count_v}
		if(count_v < 3){
			res.render("statistic_analysis", {final_datasets: null, msg: "You have to choose at least 3 criterions"})
		}
		else{
			var labels = ["Shifts confirmed in a month", "Shifts waiting for approval", "jobs waiting", "jobs declined"]
			var all_data = [0, 0, 0, 0]
			var arr_confirmed_shifts_in_months = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
			var arr_waiting_shifts_in_months = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
			var arr_waiting_jobs_in_months = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
			var arr_decliened_job_in_months = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]

			var db = client.db("employers-workers")
			var db_collection = db.collection("employersWorkers")
			db_collection.find().toArray(function (err, allDetails) {
				if (err) {
					console.log(err)
				}
				else {
					for(var i=0; i<allDetails.length; ++i){
						if(jobs_waiting){
							for(var j=0; j<allDetails[i].job_requests.length; ++j){
								var shift_date = allDetails[i].job_requests[j][0]
								var shift_month = (shift_date.split("/"))[0]
								arr_waiting_jobs_in_months[shift_month - 1] = arr_waiting_jobs_in_months[shift_month - 1] + 1
							}
						}
						if(jobs_decliend){
							for(j=0; j<allDetails[i].canceled_jobs.length; ++j){
								shift_date = allDetails[i].canceled_jobs[j][0]
								shift_month = (shift_date.split("/"))[0]
								arr_decliened_job_in_months[shift_month - 1] = arr_decliened_job_in_months[shift_month - 1] + 1
							}
						}
					}
					if(jobs_waiting){
						const index = labels.indexOf("jobs waiting")
						if (index > -1) {
							all_data[index] = arr_waiting_jobs_in_months
						}
					}
					else{
						const index = labels.indexOf("jobs waiting")
						if (index > -1) {
							labels.splice(index, 1)
							all_data.splice(index, 1)
						}
					}
					if(jobs_decliend){
						const index = labels.indexOf("jobs declined")
						if (index > -1) {
							all_data[index] = arr_confirmed_shifts_in_months
						}

					}
					else{
						const index = labels.indexOf("jobs declined")
						if (index > -1) {
							labels.splice(index, 1)
							all_data.splice(index, 1)
						}
					}
				}
			})

			db = client.db("contractor-workers")
			db_collection = db.collection("contractorWorkers")
			db_collection.find().toArray(function (err, allDetails) {
				if (err) {
					console.log(err)
				}
				else {

					for(var i=0; i<allDetails.length; ++i){
						if(shifts_confirmed){
							for(var j=0; j<allDetails[i].work_history.length; ++j){
								var shift_date = allDetails[i].work_history[j][0]
								var shift_month = (shift_date.split("/"))[0]
								arr_confirmed_shifts_in_months[shift_month - 1] = arr_confirmed_shifts_in_months[shift_month - 1] + 1
							}
							const index = labels.indexOf("Shifts confirmed in a month")
							if (index > -1) {
								all_data[index] = arr_confirmed_shifts_in_months
							}

						}
						else{
							const index = labels.indexOf("Shifts confirmed in a month")
							if (index > -1) {
								labels.splice(index, 1)
								all_data.splice(index, 1)
							}
						}

						if(shifts_waiting){
							for(j=0; j<allDetails[i].shifts.length; ++j){
								shift_date = allDetails[i].shifts[j][0]
								shift_month = (shift_date.split("/"))[0]
								arr_waiting_shifts_in_months[shift_month - 1] = arr_waiting_shifts_in_months[shift_month - 1] + 1
							}
							const index = labels.indexOf("Shifts waiting for approval")
							if (index > -1) {
								all_data[index] = arr_waiting_shifts_in_months
							}

						}
						else{
							const index = labels.indexOf("Shifts waiting for approval")
							if (index > -1) {
								labels.splice(index, 1)
								all_data.splice(index, 1)
							}
						}
					}
					// create datasets
					var datasets = []
					for(var k = 0; k<labels.length; ++k){
						datasets.push({
							label: labels[k],
							data: all_data[k],})
					}

					res.render("statistic_analysis", {final_datasets: datasets, msg:null})

				}
			})
		}

		
		

	})


}).catch(console.error)

app.listen(port, () => {
	console.log("Listening to port 3000!!!")
})

function toSeconds(time_str) {
	// Extract hours, minutes and seconds
	var parts = time_str.split(":")
	// compute  and return total seconds
	return parts[0] * 3600 + // an hour has 3600 seconds
		parts[1] * 60   // a minute has 60 seconds
}

function totalPayForShift(start_time, end_time, hourly_pay){
	// If can't calculate total time because the input isn't in the right format
	if (start_time.match(/^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/) == null || end_time.match(/^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/) == null) {
		console.log("Can't calculate the payment, start time/end time aren't in the right format")
		return null
	}
	var difference = Math.abs(toSeconds(start_time) - toSeconds(end_time))
	// compute hours, minutes and seconds
	var result = [
		// an hour has 3600 seconds so we have to compute how often 3600 fits
		// into the total number of seconds
		Math.floor(difference / 3600), // HOURS
		// similar for minutes, but we have to "remove" the hours first;
		// this is easy with the modulus operator
		Math.floor((difference % 3600) / 60), // MINUTES
		// the remainder is the number of seconds
		difference % 60 // SECONDS
	]
	// formatting (0 padding and concatenation)
	result = result.map(function (v) {
		return v < 10 ? "0" + v : v
	}).join(":")

	var total = result.split(":")
	var total_hours = total[0]
	var total_minutes = total[1]
	var total_pay = hourly_pay * total_hours + (total_minutes / 60) * hourly_pay
	return total_pay
}

function totalTimeForShift(start_time, end_time){
	// If can't calculate total time because the input isn't in the right format
	if (start_time.match(/^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/) == null || end_time.match(/^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/) == null) {
		console.log("Can't calculate the payment, start time/end time aren't in the right format")
		return null
	}
	var difference = Math.abs(toSeconds(start_time) - toSeconds(end_time))
	// compute hours, minutes and seconds
	var result = [
		// an hour has 3600 seconds so we have to compute how often 3600 fits
		// into the total number of seconds
		Math.floor(difference / 3600), // HOURS
		// similar for minutes, but we have to "remove" the hours first;
		// this is easy with the modulus operator
		Math.floor((difference % 3600) / 60), // MINUTES
		// the remainder is the number of seconds
		difference % 60 // SECONDS
	]
	// formatting (0 padding and concatenation)
	result = result.map(function (v) {
		return v < 10 ? "0" + v : v
	}).join(":")

	var total = result.split(":")
	var total_hours = parseInt(total[0], 10)
	var total_minutes = parseInt(total[1], 10)
	return [total_hours, total_minutes]
}

function send_an_email(receiver_email, subject, message) {
	var nodemailer = require("nodemailer")
	var transporter = nodemailer.createTransport({
		service: "gmail",
		auth: {
			user: "companymailsce@gmail.com",
			pass: "sce147258369"
		}
	})

	var mailOptions = {
		from: "companymailsce@gmail.com",
		to: receiver_email,
		subject: subject,
		text: message
	}

	transporter.sendMail(mailOptions, function (error, info) {
		if (error) {
			console.log(error)
		} else {
			console.log("Email sent: " + info.response)
		}
	})
}

//var data = {
//  "user": user_name,
//  "password": passwordd
//}
//console.log(data)
//loginData.insertOne(data, function (err, collection) {
//  if (err) {
//      throw err
//  }
//  console.log("Record inserted Successfully" + collection.insertedCount)
//})




//var dbo = client.db("login-auth")
//dbo.collection("loginData").find({"user":user_name , "password":passwordd}).count().then(function(numItems) {
//  console.log("Number of items:",numItems) // Use this to debug
//  if (numItems  == 1)
//  {
//      res.sendFile(__dirname + "/loggedIn.html")
//  }
//  else
//  {
//      console.log("User Not Exist! \n")
//      res.render("Login")
//  }
//})

