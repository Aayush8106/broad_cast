const tableBody = document.getElementById("tableBody");

async function loadUsers() {

    const response = await fetch("/admin-users");

    if (!response.ok) {
        window.location.href = "/";
        return;
    }

    const data = await response.json();

    tableBody.innerHTML = "";

    data.forEach((item) => {

        const row = document.createElement("tr");

        row.className =
            "text-black border-b border-gray-700 hover:bg-gray-800 hover:text-white";

        row.innerHTML = `
            <th class="px-6 py-4 font-medium">${item.id}</th>

            <td class="px-6 py-4">
                ${item.name}
            </td>

            <td class="px-6 py-4">
                ${item.mail}
            </td>

            <td class="px-6 py-4">
    <button
        class="btn btn-sm ${item.ban ? "btn-success" : "btn-warning"}"
        onclick="banUser(${item.id})"
        ${item.id === 1 ? "disabled" : ""}
    >
        ${item.ban ? "UNBAN" : "BAN"}
        </button>
        </td>

    <td class="px-6 py-4">
     <button
        class="btn btn-sm btn-danger"
        onclick="deleteUser(${item.id})"
        ${item.id === 1 ? "disabled" : ""}
    >
                DELETE
             </button>
        </td>
        `;

        tableBody.appendChild(row);

    });

}

loadUsers();

async function banUser(id) {

    const confirmBan = confirm("Are you sure?");

    if (!confirmBan) return;

    const response = await fetch(`/admin/ban/${id}`, {
        method: "POST"
    });

    if (!response.ok) {
        alert("Failed.");
        return;
    }

    loadUsers();
}

async function deleteUser(id) {

    const confirmDelete = confirm(
        "Delete this user permanently?"
    );

    if (!confirmDelete) return;

    const response = await fetch(`/admin/delete/${id}`, {
        method: "DELETE"
    });

    if (!response.ok) {
        alert("Failed.");
        return;
    }

    loadUsers();
}