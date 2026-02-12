const axios = require('axios');

async function testLogin() {
    try {
        console.log('Testing login for jhon.doe@abc.com...\n');

        const response = await axios.post('http://localhost:3001/api/v1/auth/login', {
            email: 'jhon.doe@abc.com',
            password: 'password123'
        });

        console.log('✓ Login successful!');
        console.log('\nUser Details:');
        console.log('- ID:', response.data.user.id);
        console.log('- Name:', response.data.user.fullName);
        console.log('- Email:', response.data.user.email);
        console.log('- Role:', response.data.user.role);
        console.log('- Employee ID:', response.data.user.employeeId);
        console.log('\nAccess Token:', response.data.access_token.substring(0, 50) + '...');

        // Check existing KPI plans
        const token = response.data.access_token;
        const plansResponse = await axios.get('http://localhost:3001/api/v1/kpi/plans', {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('\n=== Existing KPI Plans ===');
        if (plansResponse.data.data.length > 0) {
            plansResponse.data.data.forEach(plan => {
                console.log(`\nPlan ID: ${plan.id}`);
                console.log(`  Period: ${plan.periodId}`);
                console.log(`  Status: ${plan.status}`);
                console.log(`  Total Score: ${plan.totalScore}`);
                console.log(`  Grade: ${plan.finalGrade || 'N/A'}`);
            });

            console.log('\n⚠️  Note: User already has a KPI plan for period 202602');
            console.log('   To create a new plan, you need to:');
            console.log('   1. Create a new period (e.g., March 2026)');
            console.log('   2. Or select a different user');
        } else {
            console.log('No existing plans found');
        }

    } catch (error) {
        if (error.response) {
            console.error('✗ Login failed:', error.response.data.message);
        } else {
            console.error('✗ Error:', error.message);
        }
    }
}

testLogin();
