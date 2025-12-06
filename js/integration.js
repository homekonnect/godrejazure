// integration.js — small helper to wire the sample form flow to the existing script.js helpers

(function () {
  // Initialize intl-tel-input for the sample form phone input
  document.addEventListener('DOMContentLoaded', function () {
    // Use the same initializer provided in script.js.
    // Support the exact Zoho exported form fields which use
    // id="international_PhoneNumber_countrycode" and
    // id="international_PhoneNumber_countrycodeval" as well as
    // name="PhoneNumber_countrycode" / name="PhoneNumber_countrycodeval".
    if (window.initPhoneInput) {
      // Preferred id from Zoho export
      if (document.getElementById('international_PhoneNumber_countrycode')) {
        initPhoneInput('international_PhoneNumber_countrycode');
      }

      // Fallback: initialize any input with name="PhoneNumber_countrycode"
      const byName = document.querySelector('input[name="PhoneNumber_countrycode"]');
      if (byName && !window.itiInstances[byName.id]) {
        // if it has no id, assign a temporary one
        if (!byName.id) byName.id = 'PhoneNumber_countrycode_auto';
        initPhoneInput(byName.id);
      }
    }
  });

  // The original Zoho sample used zf_ValidateAndSubmit(); produce a compatible function
  // that reuses our existing validation and phone extraction logic.
  window.zf_ValidateAndSubmit = function () {
    const formId = 'form';
    const form = document.getElementById(formId);
    if (!form) return false;

    // Run the existing per-field validation (customValidateForm expects a formId)
    if (typeof customValidateForm === 'function') {
      if (!customValidateForm(formId)) return false;
    }

    // Collect phone details like customValidateAndSubmit would
    const inputId = 'international_PhoneNumber_countrycode';
    const iti = window.itiInstances && window.itiInstances[inputId];

    let dialCode = '91';
    let cleanNumber = '';

    if (iti) {
      dialCode = iti.getSelectedCountryData().dialCode || '91';
      cleanNumber = document.getElementById(inputId).value.replace(/\D/g, '');
    } else {
      const phoneEl = form.querySelector('input[name="PhoneNumber_countrycode"]');
      if (phoneEl) cleanNumber = phoneEl.value.replace(/\D/g, '');
    }

    dialCode = dialCode.replace('+', '');

    // Set the required Zoho hidden field(s).
    // Zoho exports sometimes reference different casing `PhoneNumber_countrycodeVal`.
    const ccLower = form.querySelector('input[name="PhoneNumber_countrycodeval"]') || document.getElementById('international_PhoneNumber_countrycodeval');
    const ccUpper = form.querySelector('input[name="PhoneNumber_countrycodeVal"]');
    if (ccLower) ccLower.value = '+' + dialCode;
    if (ccUpper) ccUpper.value = '+' + dialCode;

    // Set the numeric phone field value before submit
    const phoneField = form.querySelector('input[name="PhoneNumber_countrycode"]');
    if (phoneField) phoneField.value = cleanNumber;

    // Optional full backup
    const fullPhone = form.querySelector('input[name="PhoneNumber"]');
    if (fullPhone) fullPhone.value = '+' + dialCode + cleanNumber;

    // Let the form post normally
    return true;
  };
})();