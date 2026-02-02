import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
const supabaseUrl = 'https://ijyzgiocbhgqpfsauapm.supabase.co/';
const supabaseKey = 'sb_publishable_rzM3V_W7Y2kP9juN_vpUIA_2nYrAVOb';
const supabase = createClient(supabaseUrl, supabaseKey);


async function changeVisible(id, visible) {
    const { error } = await supabase
    .from('announcements')
    .update({ 'visible': !visible })
    .eq('id', id)
    editAnnouncements()
    }

async function editAnnouncements() {
    const { data, error } = await supabase
        .from('announcements')
        .select('*');
        if (error) {
        console.error('Error:', error);
        document.getElementById('tableBody').innerHTML = 
            '<tr><td colspan="5">Error loading data</td></tr>';
        return;
    }
        // Display the data in the table
    const tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = '';
        data.forEach(row => {
            const date = new Date(row.created_at);
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            const day = date.getDate();
            const date_to_use = `${month}/${day}/${year}`;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${date_to_use}</td>
            <td>${row.type}</td>
            <td>${row.posted_by}</td>
            <td>${row.announcement_text}</td>
            <td>${row.visible}</td>
            <td>
                <button class="btn-edit"> 
                    Edit
                  </button>
                  </td>
            <td>
                <button class="btn-visible" onclick="changeVisible(${row.id}, ${row.visible})"> 
                    Toggle Visibility
                  </button>
                  </td>
            <td>
                <button class="btn-delete" onclick="deleteAnnouncement(${row.id})">
                    Delete
                  </button>
                  </td>
        `;
        
        tableBody.appendChild(tr);
    });
    tableBody.innerHTML

}


async function deleteAnnouncement(id) {
    const { error } = await supabase
    .from('announcements')
    .update({ 'deleted': true, 'visible': false})
    .eq('id', id)
    editAnnouncements()
    }

async function loadAnnouncements() {
    const { data, error } = await supabase
        .from('announcements')
        .select(`* ORDER by type, created_at 
            where visible is TRUE and deleted is FALSE`);
    
    if (error) {
        console.error('Error:', error);
        document.getElementById('tableBody').innerHTML = 
            '<tr><td colspan="5">Error loading data</td></tr>';
        return;
    }
    
    // Display the data in the table
    const tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = '';
    const filterTrue = true

    
    data.forEach(row => {
        if (row.visible === filterTrue) {
            const date = new Date(row.created_at);
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            const day = date.getDate();
            const date_to_use = `${month}/${day}/${year}`;
            const tr = document.createElement('tr');
        tr.innerHTML = 
            `<td>${date_to_use}</td>
            <td>${row.type}</td>
            <td>${row.posted_by}</td>
            <td>${row.announcement_text}</td>
        `;
        tableBody.appendChild(tr);}

    });

}

async function loadChapters() {
    const { data, error } = await supabase
        .from('chapters')
        .select(`id, long_name`)
        .eq('active', true)
        .order('long_name') 
    
    if (error) {
        console.error('Error:', error);
        document.getElementById('selectChapter').innerHTML = 
            `<tr><td colspan="5">Error loading data</td></tr>`;
        return;
    }
    
    // Display the data in the table
    const selectChapterElement = document.getElementById('selectChapter');
    
    selectChapterElement.innerHTML = '<option value:"">--Select a chapter ---</option>'
    
    data.forEach(row => {
        const option = document.createElement('option');
        option.value = row.id;
        option.textContent = row.long_name;
        selectChapterElement.appendChild(option)
    });
    }

async function getLogin() {
    const { data, error } = await supabase.auth.getSession()
    console.log(data.session.user.id)
    const id= data.session.user.id;

    const { data: data_profiles, error: error_profiles } = await supabase
        .from('profiles')
        .select(`*`)
        .eq('id', id);
    console.log(data_profiles);
//    console.log(data_profiles[0].first_name);
    const first_name = data_profiles[0].first_name;
    const chapter = data_profiles[0].chapter_key;
    const role = data_profiles[0].role;

    const {data: chapter_data, error: chapter_error} = await supabase
    .from('chapters')
    .select('long_name')
    .eq('short_name', chapter);
    const chapter_long = chapter_data[0].long_name;

    return {first_name, chapter_long, role};
    
}


async function loadUsers() {
    const { data, error } = await supabase
        .from('profiles')
        .select(`*`)
        .order('active', 'chapter_key', 'last_name', 'first_name')
    
        console.log(data)

    if (error) {
        console.error('Error:', error);
        document.getElementById('userTableBody').innerHTML = 
            '<tr><td colspan="5">Error loading data</td></tr>';
        return;
    }
    
    // Display the data in the table
    const userTableBody = document.getElementById('userTableBody');
    userTableBody.innerHTML = '';
    const filterTrue = true

    
    data.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = 
            `<td>${row.first_name}</td>
            <td>${row.last_name}</td>
            <td>${row.email}</td>
            <td>${row.chapter_key}</td>
            <td>${row.active}</td>
        `;
       userTableBody.appendChild(tr);

    });

}

async function editUsers() {
    const { data, error } = await supabase
        .from('profiles')
        .select('*');
    
    if (error) {
        console.error('Error:', error);
        document.getElementById('userTableBody').innerHTML = 
            '<tr><td colspan="8">Error loading data</td></tr>';
        return;
    }
    // Display the data in the table
    const userTableBody = document.getElementById('userTableBody');
    userTableBody.innerHTML = '';
    
    data.forEach(row => {
        const tr = document.createElement('tr');
        const row_id = `data-user_id${row.id}`;
        console.log(row.role)
        tr.id = row_id;
        tr.innerHTML = `
            <td>${row.first_name}</td>
            <td>${row.last_name}</td>
            <td>${row.email}</td>
            <td>${row.chapter_key}</td>
            <td class="role-cell">${row.role}</td>
            <td class="active-cell">${row.active}</td>
            <td>
                <button class="btn-approve", data-id="${row.id}" data-row="${row_id}"> 
                    Approve
                    </button>
                    </td>
            <td>
                <button class="btn-admin" data-id="${row.id}" data-admin="${row.role}" data-row="${row_id}"> 
                    Adimn?
                    </button>
                    </td>
            <td>
                <button class="btn-active" data-id="${row.id}" data-active="${row.active}" data-row="${row_id}"> 
                    Active?
                    </button>
                    </td>
        `;

//        tr.querySelector('.btn-approve').addEventListener('click', () => approveUser(row.id, row_id));
//        tr.querySelector('.btn-active').addEventListener('click', () => changeActive(row.id, row.active, row_id));
        userTableBody.appendChild(tr);
    });
    
    }



async function approveUser(id, row_id, buttonElement) {
    const { error } = await supabase
    .from('profiles')
    .update({ 'role': 'member'})
    .eq('id', id);
    if (error) {
        console.error('Error change approving member:', error);
        return;
    }
    const row = buttonElement.closest('tr');
    const roleCell = row.cells[4];
    roleCell.textContent = 'member';
    }

async function changeAdmin(id, role, row_id, buttonElement) {
    if (role === 'admin') {
    const { error } = await supabase
    .from('profiles')
    .update({ 'role': 'member'})
    .eq('id', id);
    if (error) {
        console.error('Error changing to member:', error);
        return;
    }
    const row = buttonElement.closest('tr');
    const roleCell = row.cells[4];
    roleCell.textContent = 'member';
    } else if (role === 'member') {
        const { error } = await supabase
        .from('profiles')
        .update({'role': 'member'})
        .eq('id', id);
        if (error) {
            console.error('Error changing to admin:', error);
            return;
        }
        const row = buttonElement.closest('tr');
        const roleCell = row.cells[4];
        roleCell.textContent = 'admin';
      }
    }

    

async function changeActive(id, active, row_id, buttonElement) {
    const isActive = active === true || active==='true';
    const { error } = await supabase
    .from('profiles')
    .update({ 'active': !isActive })
    .eq('id', id)
    if (error) {
        console.error('Error change active status:', error);
        return;
    }
    const row = buttonElement.closest('tr');
    const activeCell = row.cells[5];
    activeCell.textContent = !isActive;
    buttonElement.dataset.active = !isActive;
    }
    

export {supabase};
window.getLogin=getLogin;
window.supabase=supabase;
window.loadAnnouncements=loadAnnouncements;
window.editAnnouncements=editAnnouncements;
window.changeVisible=changeVisible;
window.deleteAnnouncement=deleteAnnouncement;
window.loadChapters=loadChapters;
window.loadUsers=loadUsers;
window.editUsers=editUsers;
window.approveUser=approveUser;
window.changeActive=changeActive;
window.changeAdmin=changeAdmin;