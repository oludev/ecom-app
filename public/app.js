$("#wrapper").click (function(){
    $(".icon").toggleClass("close");
});


//-----------------------form validation------
(function() {
'use strict';
window.addEventListener('load', function() {
// Fetch all the forms we want to apply custom Bootstrap validation styles to
var forms = document.getElementsByClassName('needs-validation');
// Loop over them and prevent submission
var validation = Array.prototype.filter.call(forms, function(form) {
  form.addEventListener('submit', function(event) {
    if (form.checkValidity() === false) {
      event.preventDefault();
      event.stopPropagation();
    }
    form.classList.add('was-validated');
  }, false);
});
}, false);
})();


$("#forgot-password-form").validate({
  rules: {
    fp_email: "required",
  },
  errorClass: "form-invalid"
});

// Form Submission
$("#forgot-password-form").submit(function() {
  remove_loading($(this));
  
  if(options['useAJAX'] == true)
  {
    // Dummy AJAX request (Replace this with your AJAX code)
    // If you don't want to use AJAX, remove this
    dummy_submit_form($(this));
  
    // Cancel the normal submission.
    // If you don't want to use AJAX, remove this
    return false;
  }
});

document.addEventListener('DOMContentLoaded', () => {
  const pass = document.querySelector('#password');
  const btn = document.querySelector('#togglePassword');

  // Check if 'btn' is not null before adding the event listener
  if (btn) {
    btn.addEventListener('click', () => {
      if (pass.type === "text") {
        pass.type = "password";
        btn.innerHTML = "visibility_off";
      } else {
        pass.type = "text";
        btn.innerHTML = "visibility";
      }
    });
  }
});

function myFunction() {
  // Declare variables
  var input, filter, ul, li, a, i, txtValue;
  input = document.getElementById('search');
  filter = input.value.toUpperCase();
  ul = document.getElementById("myUL");
  li = ul.getElementsByTagName('li');

  // Loop through all list items, and hide those who don't match the search query
  for (i = 0; i < li.length; i++) {
    a = li[i].getElementsByTagName("a")[0];
    txtValue = a.textContent || a.innerText;
    if (txtValue.toUpperCase().indexOf(filter) > -1) {
      li[i].style.display = "";
    } else {
      li[i].style.display = "none";
    }
  }
}


function myFunction() {
  var input, filter, ul, li, a, i, txtValue;
  input = document.getElementById("myInput");
  filter = input.value.toUpperCase();
  ul = document.getElementById("buylist");
  li = ul.getElementsByTagName("li");
  
  // If we've got more than 1 char in <input>, show it, otherwise, hide
  const inputDisplay = input.value.length > 1 ? 'block' : 'none';
 
  ul.style.display = inputDisplay;
  
  for (i = 0; i < li.length; i++) {
      a = li[i].getElementsByTagName("a")[0];
      txtValue = a.textContent || a.innerText;
      if (txtValue.toUpperCase().indexOf(filter) > -1) {
          li[i].style.display = "";
      } else {
          li[i].style.display = "none";
      }
  }
  }


  document.addEventListener("DOMContentLoaded", () => {
  const buttons = document.querySelectorAll('.order-status-filter');

  buttons.forEach(button => {
    button.addEventListener('click', async () => {
      const status = button.dataset.status;

      try {
        const response = await fetch(`/api/orders?status=${status}`);
        const data = await response.json();

        if (data.success) {
          const tbody = document.querySelector("table tbody");
          tbody.innerHTML = "";

          if (data.orders.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center">No orders found.</td></tr>`;
            return;
          }

          data.orders.forEach((order, index) => {
            const row = `
              <tr>
                <td>${index + 1}</td>
                <td>${order.transaction_id}</td>
                <td>${order.transaction_ref}</td>
                <td>BGN ${order.amount}</td>
                <td>${order.status}</td>
                <td>${order.created_at}</td>
              </tr>
            `;
            tbody.insertAdjacentHTML("beforeend", row);
          });
        } else {
          alert("Failed to fetch orders.");
        }
      } catch (error) {
        console.error("Error fetching orders:", error);
      }
    });
  });
});


$(document).ready(function () {
  $('.order-filter-btn').on('click', function (e) {
    e.preventDefault();

    const status = this.getAttribute('data-status');
    console.log('Loaded status:', status);
    console.log("Filtering by status:", status);

    fetch(`/orders/filter?status=${status}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const orders = data.orders;
          console.log('Orders returned:', orders);
          let html = '';

          orders.forEach((order, index) => {
            html += `
              <tr>
                <td>${index + 1}</td>
                <td>${order.transaction_id}</td>
                <td>${order.transaction_ref}</td>
                <td>BGN ${order.amount}</td>
                <td>${order.status}</td>
                <td>${order.created_at}</td>
              </tr>
            `;
          });

          $('#ordersBody').html(html);
        } else {
          $('#ordersBody').html(`<tr><td colspan="6" class="text-center text-danger">Failed to load orders.</td></tr>`);
        }
      })
      .catch(err => {
        console.error(err);
        $('#ordersBody').html(`<tr><td colspan="6" class="text-center text-danger">Error loading orders.</td></tr>`);
      });
  });
});

document.addEventListener('DOMContentLoaded', () => {
  const hamburgerBtn = document.getElementById('hamburgerBtn');
  const sidebar = document.getElementById('sidebar');
  const adminContent = document.getElementById('admin-content');

  if (hamburgerBtn && sidebar && adminContent) {
    hamburgerBtn.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      adminContent.classList.toggle('full-width');
    });
  }
});


