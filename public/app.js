import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'https://ijyzgiocbhgqpfsauapm.supabase.co/';
const supabaseKey = 'sb_publishable_rzM3V_W7Y2kP9juN_vpUIA_2nYrAVOb';
const supabase = createClient(supabaseUrl, supabaseKey);


// NAVIGATION SECTION

async function navMenu() {
    var x = document.getElementById("myTopnav");
    const login_data = await getLogin();
    const role = login_data.role;

    // (fancy if/else statement)
    x.className = x.className === "topnav" ? "topnav responsive" : "topnav";

    if (['admin', 'organizer', 'superuser'].includes(role)) {
      x.innerHTML = `
          <a href="main_portal.html#home" class="active">Home</a>
          <a href="main_portal.html#announcement-section">Announcements</a>
          <a href="main_portal.html#myinformation-section">My Info</a>
          <a href="main_portal.html#chapterinformation-section">Chapter</a>
          <a href="main_portal.html#MRC-section">MRC</a>
          <a href="index.html" onclick="signOut()">Sign Out</a>
          <a href="admin_portal.html">Admin</a>
          <a href="javascript:void(0);" class="icon" onclick="navMenu()">
            <i class="fa fa-bars"></i>
          </a>`
  }
}


// AUTHENTICATION

async function getLogin() {
    try {
        const { data, error } = await supabase.auth.getSession()

        if (error) throw error;

        if (!data?.session?.user?.id) {
            throw new Error('No active session');
        }

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('first_name, chapter, role')
            .eq('id', data.session.user.id)
            .single();
        
        if (profileError) throw profileError;

        return {
            first_name: profile.first_name,
            chapter: profile.chapter,
            role: profile.role
        };
    } catch (error) {
        console.error('Error getting login data:', error);
//        window.location.replace('index.html');
        throw error;
    }
}
async function signOut() {
    const { error } = await supabase.auth.signOut()}

// ANNOUNCEMENTS

async function loadAnnouncements() {
    try {
        const { data, error } = await supabase
            .from('announcements')
            .select('*')
            .eq('visible', true)
            .eq('deleted', false)
            .order('type')
            .order('created_at');
            
        if (error) throw error;

        const tableBody = document.getElementById('tableBody');

        if(!data || data.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="4" class="empty-state">No announcements available</td></tr>';
            return;
        }

        tableBody.innerHTML = data.map(row => {
            const date = new Date(row.created_at);
            const formattedDate = `${date.getMonth() +1}/${date.getDate()}/${date.getFullYear()}`;

            return `
            <tr>
                <td class="col-announce-date" data-label="Date">
                    ${formattedDate}
                </td>
                <td class="col-announce-type" data-label="Type">
                    ${row.type}
                </td>
                <td class="col-announce-posted" data-label="Posted By">
                    ${row.posted_by}
                </td>
                <td class="col-announce-text" data-label="Announcement">
                    ${row.announcement_text}
                </td>
            </tr>
            `;}).join('');
    } catch (error) {
        console.error('Error loading announcements:', error);
        document.getElementById('tableBody').innerHTML = 
        '<tr><td colspan="4">Error loading announcements</td></tr>';
    }

}

//USERS

async function editUsers() {
    try {
        const login_info = await getLogin();
        const chapter = login_info.chapter;
        
        let query = supabase
            .from('profiles')
            .select('*')
            .order('role', { ascending: false});

        if (chapter !=='SEIU Healthcare Pennsylvania') {
            query.eq('chapter', chapter);
        }

        const { data, error } = await query;

        if (error) throw error;

        const userTableBody = document.getElementById('userTableBody');

        if (!data || data.length === 0) {
            userTableBody = '<tr><td colspan="7" class="empty-state">No users found</td></tr>';
            return;
        }

        userTableBody.innerHTML = data.map(row => `
        <tr id="user-row-${row.id}">
            <td class="col-user-first" data-label="First Name">${row.first_name}</td>
            <td class="col-user-last" data-label="Last Name">${row.last_name}</td>
            <td class="col-user-email" data-label="Email">${row.email}</td>
            <td class="col-user-chapter" data-label="Chapter">${row.chapter}</td>
            <td class="col-user-role" data-label="Role">${row.role}</td>
            <td class="col-user-active" data-label="Active?">${row.active}</td>
            <td class="col-user-actions">
                <button class="btn-approve" data-id="${row.id}"> 
                    Approve
                    </button>
                <button class="btn-active" data-id="${row.id}" data-active="${row.active}"> 
                    ${row.active ? 'Deactivate' : 'Activate'}
                </button>
            </td>
        </tr>
        `).join('');
        setupUserActions();

    } catch (error) {
        console.error('Error loading users:', error);
        document.getElementById('userTableBody').innerHTML = 
            '<tr><td colspan="7">Error loading users</td></tr>';
    }
}

async function setupUserActions() {
    const tableBody = document.getElementById('userTableBody');
    tableBody.addEventListener('click', async (e) => {
      const target = e.target;

      if (target.classList.contains('btn-approve')) {
        const id = target.dataset.id;
        const confirmed = confirm('Approve this user as a member?');

        if (confirmed) {
          target.disabled = true;
          target.textContent = 'Approving...';
          await approveUser(id, target);
        }
      }

      if (e.target.classList.contains('btn-active')) {
          const id = target.dataset.id;
          const active = target.dataset.active;
          const action = (active === true || active === 'true' ) ? 'deactivate' : 'activate';
          const confirmed = confirm(`Are you sure you want to ${action} this users?`)

          if (confirmed) {
            target.disabled = true;
            const originalText = target.textContent;
            target.textContent = 'Updating...';

            try {
              await changeActive(id, active, target);
            } catch (error) {
              target.disabled = false;
              target.textContent = originalText;
              alert('Failed to update user status. Please try again.');
            }
          }
      }

      if (target.classList.contains('btn-admin')) {
                    const id = target.dataset.id;
                    const role = target.dataset.role;
                    const action = role === 'admin' ? 'remove admin privileges from' : 'grant admin privileges to';
                    const confirmed = confirm(`Are you sure you want to ${action} this user?`);
                    
                    if (confirmed) {
                        target.disabled = true;
                        target.textContent = 'Updating...';
                        await changeAdmin(id, role, target);
                    }
                }
            });
        }

async function approveUser(id, buttonElement) {
    try {
        const { data, error: fetchError } = await supabase 
            .from('profiles')
            .select('role')
            .eq('id', id)
            .single();
        
        if (fetchError) throw fetchError;

        if (data.role !== 'non-member') {
            alert('User is already approved.')
        } 

        if (data.role === 'non-member') {
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ role: 'member'})
                .eq('id', id);
            
            if (updateError) throw updateError;

            const row = buttonElement.closest('tr');
            const roleCell = row.cells[4];
            roleCell.textContent = 'member';
            buttonElement.editUsers = true;
            buttonElement.textContent = 'Approved';
        }
    } catch (error) {
        console.error('Error approving user:', error);
        alert('Failed to approve user. Please try again.');
    }
}

async function changeActive(id, currentActive, buttonElement) {
    try {
        const isActive = currentActive === true || currentActive==='true';
        const { error } = await supabase
            .from('profiles')
            .update({ active: !isActive })
            .eq('id', id)
        if (error) throw error;
    
        const row = buttonElement.closest('tr');
        const activeCell = row.cells[5];
        activeCell.textContent = !isActive;
        buttonElement.dataset.active = !isActive;
        buttonElement.textContent = !isActive ? 'Deactivate' : 'Activate';
        buttonElement.disabled = false;

    } catch (error) {
        console.error('Error changing active status:', error);
        alert('Failed to change active status. Please try again.');
        buttonElement.disabled = false;
        buttonElement.textContent = currentActive === 'true' || currentActive === true ? 'Deactivate' : 'Activate';
        throw error;
    }
}    


// CHAPTERS


async function loadChapters() {
    try {
        const { data, error } = await supabase
            .from('chapters')
            .select(`id, long_name`)
            .eq('active', true)
            .order('long_name');
        
        if (error) throw error;
        const selectElement = document.getElementById('selectChapter');

        selectElement.innerHTML = '<option value="">--Select a chapter --</option>' +
            data.map(row => `<option value="${row.long_name}">${row.long_name}</option>`).join('');
    } catch (error) {        
        console.error('Error loading chapters:', error);
        document.getElementById('selectChapter').innerHTML = 
                `<option value="">Error loading chapters</option>`;
        }
    }


export {supabase};

window.getLogin=getLogin;
window.supabase=supabase;
window.loadAnnouncements=loadAnnouncements;
window.loadChapters=loadChapters;
window.editUsers=editUsers;
window.approveUser=approveUser;
window.changeActive=changeActive;
window.navMenu=navMenu;
window.signOut=signOut;