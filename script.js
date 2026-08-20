const SUPABASE_URL = 'https://twsbsaedyxueymtpaxoq.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_p6SyPr9Py7YgDsksFof9Mg_OhFeETqn'; // Replace with working key

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
3
// Check auth status on page load
window.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        showApp();
    }
});

async function handleLogin() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errDiv = document.getElementById('auth-error');
    errDiv.textContent = '';

    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

    if (error) {
        errDiv.textContent = error.message;
    } else {
        showApp();
    }
}

async function handleLogout() {
    await supabaseClient.auth.signOut();
    document.getElementById('app-content').style.display = 'none';
    document.getElementById('login-container').style.display = 'block';
}

async function showApp() {
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('app-content').style.display = 'block';
    await populateDropdowns();
    await applyFilters();
}

async function populateDropdowns() {
    const { data: units } = await supabaseClient
        .from('units')
        .select('unit_name')
        .order('unit_name', { ascending: true });

    if (units) {
        const unitSelect = document.getElementById('unit-filter');
        unitSelect.innerHTML = '<option value="All">All Units</option>';
        units.forEach(u => {
            const option = document.createElement('option');
            option.value = u.unit_name;
            option.textContent = u.unit_name;
            unitSelect.appendChild(option);
        });
    }

    const { data: statuses } = await supabaseClient
        .from('statuses')
        .select('status_name')
        .order('status_name', { ascending: true });

    if (statuses) {
        const statusSelect = document.getElementById('status-filter');
        statusSelect.innerHTML = '<option value="All">All Statuses</option>';
        statuses.forEach(s => {
            const option = document.createElement('option');
            option.value = s.status_name;
            option.textContent = s.status_name;
            statusSelect.appendChild(option);
        });
    }
}

async function applyFilters() {
    const selectedUnit = document.getElementById('unit-filter').value;
    const selectedStatus = document.getElementById('status-filter').value;

    let query = supabaseClient.from('v_scouts').select('*');

    if (selectedUnit && selectedUnit !== 'All') {
        query = query.eq('Unit', selectedUnit);
    }

    if (selectedStatus && selectedStatus !== 'All') {
        query = query.eq('Status', selectedStatus);
    }

    query = query.order('Name', { ascending: true });

    const { data, error } = await query;

    if (error) {
        console.error("Error querying v_scouts:", error);
        clearTable();
        return;
    }

    if (data && data.length > 0) {
        renderTable(data);
    } else {
        clearTable();
    }
}

function renderTable(rows) {
    const head = document.getElementById('table-head');
    const body = document.getElementById('table-body');
    head.innerHTML = '';
    body.innerHTML = '';

    // Action Header
    const actionTh = document.createElement('th');
    actionTh.textContent = 'Action';
    head.appendChild(actionTh);

    const columns = Object.keys(rows[0]);

    columns.forEach(col => {
        const th = document.createElement('th');
        th.textContent = col;
        head.appendChild(th);
    });

    rows.forEach(row => {
        const tr = document.createElement('tr');

        // Action Cell with Edit Button
        const actionTd = document.createElement('td');
        const editBtn = document.createElement('button');
        editBtn.className = 'action-btn';
        editBtn.textContent = '✏️ Edit';
        editBtn.onclick = () => openEditModal(row);
        actionTd.appendChild(editBtn);
        tr.appendChild(actionTd);

        columns.forEach(colName => {
            const td = document.createElement('td');
            const val = row[colName];
            const isEmpty = val === null || val === undefined || String(val).trim() === '';

            td.textContent = isEmpty ? '' : val;

            if (isEmpty && (colName === 'Contact Number' || colName === 'Parent Name')) {
                td.style.backgroundColor = 'Tomato';
            }

            tr.appendChild(td);
        });
        body.appendChild(tr);
    });

    document.getElementById('total-label').innerHTML = "Total Records: " + rows.length;
}

async function openEditModal(record) {
    // Access the '*ID' key using bracket notation
    const recordId = record['*ID'];

    if (!recordId) {
        alert("Error: Record ID not found in row data.");
        console.error("Missing *ID property:", record);
        return;
    }

    // Store the ID in the hidden input
    document.getElementById('edit-id').value = recordId;

    // Populate the form fields
    document.getElementById('edit-name').value = record.Name || '';
    document.getElementById('edit-contact').value = record['Contact Number'] || '';
    document.getElementById('edit-parent').value = record['Parent Name'] || '';
    document.getElementById('edit-notes').value = record.Notes || '';

    // Populate and set dropdown options
    document.getElementById('edit-unit').innerHTML = document.getElementById('unit-filter').innerHTML;
    document.getElementById('edit-status').innerHTML = document.getElementById('status-filter').innerHTML;

    document.getElementById('edit-unit').value = record.Unit || 'All';
    document.getElementById('edit-status').value = record.Status || 'All';

    document.getElementById('edit-modal').style.display = 'flex';
}

async function saveRecord() {
    const recordId = parseInt(document.getElementById('edit-id').value, 10);

    if (isNaN(recordId)) {
        alert("Invalid ID value. Update aborted.");
        return;
    }

    const selectedUnitName = document.getElementById('edit-unit').value;
    const selectedStatusName = document.getElementById('edit-status').value;

    let updatedUnitId = null;
    let updatedStatusId = null;

    // Fetch corresponding unit_id if valid
    if (selectedUnitName && selectedUnitName !== 'All') {
        const { data: unitData } = await supabaseClient
            .from('units')
            .select('id')
            .eq('unit_name', selectedUnitName)
            .maybeSingle();

        if (unitData) updatedUnitId = unitData.id;
    }

    // Fetch corresponding status_id if valid
    if (selectedStatusName && selectedStatusName !== 'All') {
        const { data: statusData } = await supabaseClient
            .from('statuses')
            .select('id')
            .eq('status_name', selectedStatusName)
            .maybeSingle();

        if (statusData) updatedStatusId = statusData.id;
    }

    // Build fields to update on the base 'scouts' table
    const updatedData = {
        "Name": document.getElementById('edit-name').value,
        "Contact Number": document.getElementById('edit-contact').value,
        "Parent Name": document.getElementById('edit-parent').value,
        "Notes": document.getElementById('edit-notes').value,
        "Unit": document.getElementById('edit-unit').value,
        "Status": document.getElementById('edit-status').value,

    };

    if (selectedUnitName !== 'All') updatedData["Unit"] = selectedUnitName;
    if (selectedStatusName !== 'All') updatedData["Status"] = selectedStatusName;
    if (updatedUnitId !== null) updatedData["unit_id"] = updatedUnitId;
    if (updatedStatusId !== null) updatedData["status_id"] = updatedStatusId;

    // Execute update without requiring returned data payload
    const { error } = await supabaseClient
        .from('scouts')
        .update(updatedData)
        .eq('id', recordId);

    if (error) {
        alert("Error updating record: " + error.message);
        console.error("Supabase error:", error);
        return;
    }

    closeModal();

    // Refresh the table UI with updated data from v_scouts
    await applyFilters();
}

function closeModal() {
    document.getElementById('edit-modal').style.display = 'none';
}
function clearTable() {
    document.getElementById('table-head').innerHTML = '';
    document.getElementById('table-body').innerHTML = '<tr><td colspan="100%">No matching records found.</td></tr>';
    document.getElementById('total-label').innerHTML = "Total Records: 0";
}

document.getElementById('unit-filter').addEventListener('change', applyFilters);
document.getElementById('status-filter').addEventListener('change', applyFilters);