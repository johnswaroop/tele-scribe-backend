const sendMail = require("./sendmail");
let supabase = require("./supabase")
const axios = require('axios');

// Global interval variable
let poolInterval = null;

// Function to subscribe to real-time changes on the 'jobs' table
async function subscribeToChanges(reload) {
    console.log('Subscribing to changes in the jobs table');
    supabase
        .channel('jobs')
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'jobs' },
            () => {
                console.log('Detected change in jobs table, reloading data');
                reload();
            }
        )
        .subscribe();
}

// Function to handle status pooling for jobs
const statusPooling = (jobs) => {
    console.log('Starting status pooling');
    poolInterval = setInterval(async () => {
        console.log('__Pooling__', jobs);

        // Fetch job statuses from an API endpoint
        try {
            let res = await axios.get(`${process.env.CLIENT}/api/status-transcribe`);
            let status = res.data;
            let COMPLETED_JOBS = [];

            // Check each job's status
            status.forEach((ele) => {
                if (jobs.includes(ele.MedicalScribeJobName)) {
                    console.log('Checking status for job:', ele.MedicalScribeJobName);
                    if (ele.MedicalScribeJobStatus === 'COMPLETED') {
                        console.log('Job completed:', ele.MedicalScribeJobName);
                        COMPLETED_JOBS.push(ele.MedicalScribeJobName);
                    }
                }
            });

            // Update completed jobs in the 'jobs' table
            COMPLETED_JOBS.forEach(async (ele) => {
                const { data, error } = await supabase
                    .from('jobs')
                    .update({ status: 'COMPLETED' })
                    .eq('title', ele)
                    .select("*");

                if (error) {
                    console.error('Update Error', error);
                } else {
                    console.log('Job status updated to COMPLETED:', ele);
                    console.log('Update response:', data);
                    if (!data[0].email_sent) {
                        sendMail(ele)
                    }
                }
            });

            // Clear interval if all jobs are completed
            if (jobs.length === COMPLETED_JOBS.length) {
                console.log('__CLEAR INTERVAL__ - All jobs completed');
                clearInterval(poolInterval);
                poolInterval = null;
            }
        } catch (error) {
            console.error('Error during status pooling:', error);
        }
    }, 30000);

    return poolInterval;
};

// Main function to manage job pooling
async function manageJobPooling() {
    console.log('Managing job pooling');

    // Clear existing interval if any
    if (poolInterval) {
        console.log('Clearing existing interval');
        clearInterval(poolInterval);
        poolInterval = null;
    }

    // Function to reload job data and start pooling if necessary
    const reloadJobs = async () => {
        console.log('Reloading job data');
        try {
            const { data: jobs, error } = await supabase.from('jobs').select('*').eq("status", "IN_PROGRESS");
            if (error) {
                console.error('Error fetching jobs', error);
                return;
            }

            let IN_PROGRESS_JOBS = jobs.map((ele) => ele.title);

            if (IN_PROGRESS_JOBS.length > 0) {
                console.log('Found IN_PROGRESS jobs:', IN_PROGRESS_JOBS);
                poolInterval = statusPooling(IN_PROGRESS_JOBS);
            }
        } catch (error) {
            console.error('Error during reloadJobs:', error);
        }
    };

    // Subscribe to changes in the 'jobs' table
    subscribeToChanges(reloadJobs);

    // Initial load of jobs
    reloadJobs();
}

// Start the job pooling management
module.exports = manageJobPooling
