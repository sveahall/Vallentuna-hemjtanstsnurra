// ======== KONSTANTER OCH KONFIGURERBARA VÄRDEN ========
// Prisbasbelopp och faktorer
const PRISBASBELOPP = 59200; // Prisbasbelopp 2026
const MAKTAXA = 2660; // Maxtaxa 2026 enligt Socialstyrelsen
const FAKTOR_OVER_65_ENSAMSTAENDE = 1.4789;
const FAKTOR_OVER_65_SAMMANLEVANDE = 1.2066;
const FAKTOR_UNDER_65_TILLAGG = 1.1000; // Multipliceras med över-65-faktorn

// Servicekostnader
const serviceCosts = {
  // Kostnader som ingår i maxtaxan
  servicemax2h: 333,
  servicemax4h: 1332,
  service8h: 2660,
  matlådaLeverans: 333,
  trygghetslarm: 267, // Ingår i maxtaxan
  
  // Kostnader som INTE ingår i maxtaxan
  Antalmatlådor: 37  // Matlådor ingår inte i maxtaxan
};

// Schablonvärden för bostadskostnader
const SCHABLON = {
  UPPVARMNING: 198, // Per kvm och år
  VATTEN_AVLOPP: 341, // Per kvm och år
  EL_PER_KVM: 4.98, // Per kvm och månad
  MAX_EL_KOSTNAD: 598, // Max elkostnad per månad
  MAX_RANTEUTGIFT: 100000, // Max ränteutgift per år som får räknas med
  FASTIGHETSAVGIFT_PROCENT: 0.0075, // 0.75% av taxeringsvärdet
  MAX_FASTIGHETSAVGIFT: 10425 // Maxbelopp för fastighetsavgift
};

// Stegvis formulär
let formSteps = [];
let stepIndicators = [];
let currentStepIndex = 0;

// ======== HUVUDKOD ========
document.addEventListener('DOMContentLoaded', function() {
    // Bind main calculation button event listener
    document.getElementById('beraknaBtn').addEventListener('click', function() {
        if (validateInput()) {
            calculateAvgift();
        } else {
            // Validation failed, user is already notified
        }
    });
  
    // Bind event listeners to civil status and housing type options
    bindEventListeners('civilstand', updateFormFields);
    bindEventListeners('boendeform', uppdateraBoendeform);
    bindEventListeners('hushallsel', toggleYtaForEl);
    bindEventListeners('matlåda', toggleAntalMatlådorPerVecka);
  
    // Initialize form fields based on current selections
    updateFormFields();
    uppdateraBoendeform();
    initializeFormBasedOnService();
    initStepper();
    showStep(0);
  
    document.getElementById('backButton').addEventListener('click', toggleFormAndResults);
  
    // Lyssna på keydown-händelser för tangentbordsnavigering och interaktioner
    document.addEventListener('keydown', function(event) {
        const focusedElement = document.activeElement;

        // Kolla om Enter trycks på utskriftsknappen
        if (event.key === 'Enter' && focusedElement.closest('#printButton')) {
            window.print();
        }

        // Kolla om Enter trycks på PDF-sparningsknappen
        if (event.key === 'Enter' && focusedElement.closest('#saveButton')) {
            generatePDF();
        }
      
        if (event.key === 'Enter' && focusedElement.type === 'radio') {
            focusedElement.click();
        }
    });

    // Lyssna på klickhändelser för utskrift och PDF-knapparna
    document.querySelector('.savePrintButtons').addEventListener('click', function(event) {
        if (event.target.closest('#printButton')) {
            window.print();
        } else if (event.target.closest('#saveButton')) {
            generatePDF();
        }
    });
});

function bindEventListeners(fieldName, handler) {
  document.querySelectorAll(`input[name="${fieldName}"]`).forEach(radio => {
      radio.addEventListener('change', handler);
  });
}

function toggleYtaForEl(e) {
  const ytaForElContainer = document.getElementById('ytaForElContainer');
  ytaForElContainer.style.display = e.target.value === 'nej' ? 'block' : 'none';
}

function toggleAntalMatlådorPerVecka(e) {
  const AntalMatlådorPerVeckaContainer = document.getElementById('AntalMatlådorPerVeckaContainer');
  AntalMatlådorPerVeckaContainer.style.display = e.target.value === 'ja' ? 'block' : 'none';
}

function toggleFormAndResults() {
  const avgiftsFormular = document.getElementById('avgiftsFormular');
  const resultsSection = document.getElementById('resultsSection');
  const displayState = avgiftsFormular.style.display === 'none' ? 'block' : 'none';

  avgiftsFormular.style.display = displayState;
  resultsSection.style.display = displayState === 'block' ? 'none' : 'block';
  
  if (resultsSection.style.display === 'block') {
    window.scrollTo({top: 0, behavior: 'smooth'});
  } else {
    showStep(0);
  }
}

function initStepper() {
  formSteps = Array.from(document.querySelectorAll('.form-step'));
  stepIndicators = Array.from(document.querySelectorAll('.step-indicator li'));

  document.querySelectorAll('.next-step').forEach(button => {
    button.addEventListener('click', () => {
      const currentStep = parseInt(button.closest('.form-step').dataset.step, 10);
      const nextStep = parseInt(button.dataset.next, 10);
      if (validateStep(currentStep)) {
        showStep(nextStep);
      }
    });
  });

  document.querySelectorAll('.prev-step').forEach(button => {
    button.addEventListener('click', () => {
      const prevStep = parseInt(button.dataset.prev, 10);
      showStep(prevStep);
    });
  });
}

function showStep(stepIndex) {
  formSteps.forEach((step, idx) => {
    step.classList.toggle('active', idx === stepIndex);
  });

  stepIndicators.forEach((indicator, idx) => {
    indicator.classList.toggle('active', idx === stepIndex);
    indicator.classList.toggle('completed', idx < stepIndex);
  });

  currentStepIndex = stepIndex;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function validateStep(stepIndex) {
  const civilStatus = document.querySelector('input[name="civilstand"]:checked')?.value;

  switch(stepIndex) {
    case 0: {
      if (!civilStatus) {
        alert('Välj civilstånd för att fortsätta.');
        return false;
      }
      return true;
    }
    case 1: {
      const ageChecked = document.querySelector('input[name="alder"]:checked');
      if (!ageChecked) {
        alert('Välj åldersgrupp för att fortsätta.');
        return false;
      }
      if (civilStatus === 'gift') {
        const partnerAgeSelected = document.querySelector('input[name="alder_partner"]:checked');
        if (!partnerAgeSelected) {
          alert('Välj åldersgrupp för partner för att fortsätta.');
          return false;
        }
      }
      return true;
    }
    case 2: {
      const boendeformChecked = document.querySelector('input[name="boendeform"]:checked');
      if (!boendeformChecked) {
        alert('Välj boendeform för att fortsätta.');
        return false;
      }
      if (boendeformChecked.value === 'hyres/bostadsratt') {
        const hyraPerManad = document.getElementById('hyraPerManad').value;
        const hushallselValue = document.querySelector('input[name="hushallsel"]:checked');
        if (!hyraPerManad) {
          alert('Fyll i hyra/avgift per månad.');
          return false;
        }
        if (!hushallselValue) {
          alert('Ange om hushållsel ingår.');
          return false;
        }
        if (hushallselValue.value === 'nej') {
          const ytaForEl = document.getElementById('ytaForEl').value;
          if (!ytaForEl) {
            alert('Fyll i yta i kvm för elberäkning.');
            return false;
          }
        }
      } else if (boendeformChecked.value === 'egen_bostadsfastighet') {
        const taxeringsvarde = document.getElementById('taxeringsvarde').value;
        const yta = document.getElementById('yta').value;
        const ranteutgiftPerAr = document.getElementById('ranteutgiftPerAr').value;
        if (!taxeringsvarde || !yta || !ranteutgiftPerAr) {
          alert('Fyll i yta, taxeringsvärde och ränteutgift för bostaden.');
          return false;
        }
      }
      return true;
    }
    case 3: {
      const nettoinkomst = document.getElementById('nettoinkomst').value;
      if (!nettoinkomst) {
        alert('Fyll i nettoinkomst per månad.');
        return false;
      }
      if (civilStatus === 'gift') {
        const partnerNettoinkomst = document.getElementById('partnerNettoinkomst').value;
        if (!partnerNettoinkomst) {
          alert('Fyll i partnerns nettoinkomst per månad.');
          return false;
        }
      }
      return true;
    }
    case 4: {
      const serviceBehovChecked = document.querySelector('input[name="servicebehov"]:checked');
      if (!serviceBehovChecked) {
        alert('Välj typ av hjälp i hemmet.');
        return false;
      }
      const matladaChecked = document.querySelector('input[name="matlåda"]:checked')?.value;
      if (!matladaChecked) {
        alert('Välj om du vill ha matlåda.');
        return false;
      }
      if (matladaChecked === 'ja') {
        const antalMatlador = document.getElementById('AntalMatlådor').value;
        if (!antalMatlador) {
          alert('Fyll i antal matlådor per vecka.');
          return false;
        }
      }
      return true;
    }
    default:
      return true;
  }
}

function initializeFormBasedOnService() {
  const selectedService = document.querySelector('input[name="servicebehov"]:checked');
  if (selectedService) {
      updateServiceCost({ target: selectedService });
  }
}

function uppdateraBoendeform() {
  const valdBoendeform = document.querySelector('input[name="boendeform"]:checked')?.value;
  const hyresBostadsrattSektion = document.getElementById('HyresBostadsrattSection');
  const egenBostadsfastighetSektion = document.getElementById('EgenBostadsfastighetSection');

  hyresBostadsrattSektion.style.display = valdBoendeform === 'hyres/bostadsratt' ? 'block' : 'none';
  egenBostadsfastighetSektion.style.display = valdBoendeform === 'egen_bostadsfastighet' ? 'block' : 'none';
}

function updateFormFields() {
  const civilStatus = document.querySelector('input[name="civilstand"]:checked')?.value;
  const partnerIncomeSection = document.getElementById('partnerIncomeSection');

  // Check the civil status and toggle the display of partner's age and income sections accordingly
  const isPartnerSectionVisible = civilStatus === 'gift';
  document.getElementById('partnerAgeSection').style.display = isPartnerSectionVisible ? 'block' : 'none';
  partnerIncomeSection.style.display = isPartnerSectionVisible ? 'block' : 'none';
}

function calculateMinimibelopp() {
  const enTolftedel = PRISBASBELOPP / 12;
  
  // Beräknar minimbelopp enligt faktorerna
  const minimibeloppOver65Ensamstande = enTolftedel * FAKTOR_OVER_65_ENSAMSTAENDE;
  const minimibeloppOver65Sammanlevande = enTolftedel * FAKTOR_OVER_65_SAMMANLEVANDE;
  const minimibeloppUnder65Ensamstande = enTolftedel * FAKTOR_OVER_65_ENSAMSTAENDE * FAKTOR_UNDER_65_TILLAGG;
  const minimibeloppUnder65Sammanlevande = enTolftedel * FAKTOR_OVER_65_SAMMANLEVANDE * FAKTOR_UNDER_65_TILLAGG;
  
  const age = document.querySelector('input[name="alder"]:checked')?.value;
  const civilStatus = document.querySelector('input[name="civilstand"]:checked')?.value;
  
  let minimibelopp;
      if (civilStatus === 'ensamstaende') {
          if (age === 'under_65') {
              minimibelopp = minimibeloppUnder65Ensamstande;
          } else {
              minimibelopp = minimibeloppOver65Ensamstande;
          }
      } else { // This covers both 'sambo' and 'gift'
          if (age === 'under_65') {
              minimibelopp = minimibeloppUnder65Sammanlevande;
          } else {
              minimibelopp = minimibeloppOver65Sammanlevande;
        }
      }
    console.log('minimibelopp:', minimibelopp);
  return minimibelopp;
}

function calculateFastighetsavgift() {
  const taxeringsvarde = parseInt(document.getElementById('taxeringsvarde').value) || 0;
  const byggar = parseInt(document.getElementById('byggar').value) || 0;
  let fastighetsavgift = 0;

  if (byggar < 2012) {
    fastighetsavgift = Math.min(taxeringsvarde * SCHABLON.FASTIGHETSAVGIFT_PROCENT, SCHABLON.MAX_FASTIGHETSAVGIFT);
  }
  console.log('fastighetsavgift:', fastighetsavgift);

  return fastighetsavgift;
}

function calculateHousingCosts() {
  const valdBoendeform = document.querySelector('input[name="boendeform"]:checked')?.value;
  let bostadsKostnad = 0;

  if (valdBoendeform === 'hyres/bostadsratt') {
    const hyraPerManad = parseInt(document.getElementById('hyraPerManad').value) || 0;
    const hushallselValue = document.querySelector('input[name="hushallsel"]:checked')?.value;
    const inkluderarEl = (hushallselValue === 'ja');
    let ytaForEl = 0;
    
    if (!inkluderarEl) {
      ytaForEl = parseInt(document.getElementById('ytaForEl').value) || 0;
    }

    const schablonElKostnad = inkluderarEl ? 0 : Math.min(ytaForEl * SCHABLON.EL_PER_KVM, SCHABLON.MAX_EL_KOSTNAD);
    bostadsKostnad = hyraPerManad + schablonElKostnad;
    
  } else if (valdBoendeform === 'egen_bostadsfastighet') {
    const yta = parseInt(document.getElementById('yta').value) || 0;
    const ranteutgiftPerAr = parseInt(document.getElementById('ranteutgiftPerAr').value) || 0;
    const tomtrattsavgald = parseInt(document.getElementById('tomtrattsavgald').value) || 0;
  
    const uppvärmningOchUppvärmningVatten = (yta * SCHABLON.UPPVARMNING) / 12;
    const vattenOchAvlopp = (yta * SCHABLON.VATTEN_AVLOPP) / 12;
    const ranteutgift = (Math.min(ranteutgiftPerAr * 0.7, SCHABLON.MAX_RANTEUTGIFT)) / 12;
    const tomtratt = tomtrattsavgald / 12;

    const fastighetsavgift = (calculateFastighetsavgift()) / 12; // Hämta fastighetsavgiften

    console.log('uppvärmningOchUppvärmningVatten:', uppvärmningOchUppvärmningVatten);
    console.log('vattenOchAvlopp:', vattenOchAvlopp);
    console.log('ranteutgiftPerAr:', ranteutgiftPerAr);
    console.log('tomtrattsavgald:', tomtrattsavgald);
    
    bostadsKostnad = uppvärmningOchUppvärmningVatten + vattenOchAvlopp + ranteutgift + fastighetsavgift + tomtratt;
  }
  const civilStatus = document.querySelector('input[name="civilstand"]:checked')?.value;
    if (civilStatus === 'sambo' || civilStatus === 'gift') {
      bostadsKostnad /= 2;
    }
    console.log('bostadsKostnad:', bostadsKostnad);
    return bostadsKostnad;
}

function calculateIncome() {
  const netIncome1 = parseInt(document.getElementById('nettoinkomst').value) || 0;
  const capitalIncome1 = parseInt(document.getElementById('kapitalinkomst').value) / 12 || 0;
  const housingAllowance = parseInt(document.getElementById('bostadstillagg').value) || 0;

  const civilStatus = document.querySelector('input[name="civilstand"]:checked')?.value;
  let totalIncome = netIncome1 + capitalIncome1 + housingAllowance;

  if (civilStatus === 'gift') {
    const partnerNetIncome = parseInt(document.getElementById('partnerNettoinkomst').value) || 0;
    const partnerCapitalIncome = parseInt(document.getElementById('partnerKapitalinkomst').value) / 12 || 0;

    totalIncome = (totalIncome + partnerNetIncome + partnerCapitalIncome) / 2;
  }
  console.log('totalIncome:', totalIncome);
  return totalIncome;
}
 
function calculateCostFromService() {
  const selectedService = document.querySelector('input[name="servicebehov"]:checked')?.value;
  const hasTrygghetslarm = document.getElementById('trygghetslarm').checked;
  const matladaChecked = document.querySelector('input[name="matlåda"]:checked')?.value;

  let serviceCost = 0;
  
  // Beräkna grundkostnad för vald service
  switch(selectedService) {
    case 'servicemax2h':
      serviceCost = serviceCosts.servicemax2h;
      break;
    case 'servicemax4h':
      serviceCost = serviceCosts.servicemax4h;
      break;
    case 'service8h':
      serviceCost = serviceCosts.service8h;
      break;
  }
  
  // Lägg till trygghetslarm om det är valt (ingår i maxtaxan)
  if (hasTrygghetslarm) {
    serviceCost += serviceCosts.trygghetslarm;
  }
  
  // Lägg till leverans av matlåda om det är valt (ingår i maxtaxan)
  if (matladaChecked === 'ja') {
    serviceCost += serviceCosts.matlådaLeverans;
  }
  
  return serviceCost;
}

function calculateMatladaCost() {
  const matladaChecked = document.querySelector('input[name="matlåda"]:checked')?.value;

  if (matladaChecked === 'ja') {
    const antalMatlador = parseInt(document.getElementById('AntalMatlådor').value) || 0;
    // Här räknar vi kostnaden för antal matlådor per vecka multiplicerat med pris per matlåda och antal veckor per månad
    // Matlådorna själva ingår INTE i maxtaxan
    const matladaCost = antalMatlador * serviceCosts['Antalmatlådor'] * (365/ 12 / 7); 
    console.log('matladaCost (ingår EJ i maxtaxa):', matladaCost);
    return matladaCost;
  }
  return 0; // Om matlåda inte är valt, returnera 0
}

function calculateAvgift() {
  const totalIncome = calculateIncome();
  const housingCosts = calculateHousingCosts(); 
  const minimumLivingAmount = calculateMinimibelopp();
  const serviceCostInMaxTaxa = calculateCostFromService(); // Kostnader som ingår i maxtaxan
  const matladaCost = calculateMatladaCost(); // Kostnader som INTE ingår i maxtaxan

  const disposableIncome = totalIncome - housingCosts - minimumLivingAmount;
  const reservedAmount = housingCosts + minimumLivingAmount;

  // Avgift för tjänster inom maxtaxan får aldrig överskrida MAKTAXA
  let maxTaxableFee = Math.min(MAKTAXA, disposableIncome, serviceCostInMaxTaxa);
  if (maxTaxableFee < 0) maxTaxableFee = 0;

  // Lägg till kostnaden för matlådor (som INTE ingår i maxtaxan)
  let finalCost = maxTaxableFee + matladaCost;

  // Avrunda till heltal
  finalCost = Math.round(finalCost);
  const maxTaxableFeeRounded = Math.round(maxTaxableFee);

  // LOGGA ALLT
  console.log('--- BERÄKNING ---');
  console.log('Nettoinkomst:', totalIncome);
  console.log('Bostadskostnad:', housingCosts);
  console.log('Minimibelopp:', minimumLivingAmount);
  console.log('Förbehållsbelopp (bostad + minimibelopp):', reservedAmount);
  console.log('Avgiftsutrymme (nettoinkomst - förbehållsbelopp):', disposableIncome);
  console.log('Servicekostnad (inkl. trygghetslarm och leverans, exkl. matlåda):', serviceCostInMaxTaxa);
  console.log('MAKTAXA:', MAKTAXA);
  console.log('Kostnad för tjänster inom maxtaxan (det som faktiskt debiteras):', maxTaxableFeeRounded);
  console.log('Matlådekostnad (maten, ej maxtaxa):', matladaCost);
  console.log('Slutlig avgift (inkl. matlåda):', finalCost);
  console.log('-----------------');

  document.getElementById('totalMonthlyCost').textContent = `${finalCost} kr`;
  document.getElementById('maxTaxaCost').textContent = `${maxTaxableFeeRounded} kr`;
  document.getElementById('netIncome').textContent = `${Math.round(totalIncome)} kr`; 
  document.getElementById('reservedAmount').textContent = `${Math.round(reservedAmount)} kr`; 
  document.getElementById('paymentMargin').textContent = `${Math.round(disposableIncome)} kr`;
  document.getElementById('MatladaCosts').textContent = `${Math.round(matladaCost)} kr`;
  document.getElementById('MatladaCostsBreakdown').textContent = `${Math.round(matladaCost)} kr`;

  // Toggle form and results visibility
  document.getElementById('avgiftsFormular').style.display = 'none';
  document.getElementById('resultsSection').style.display = 'block';

  window.scrollTo({top: 0, behavior: 'smooth'});
}

async function generatePDF() {
  try {
    const element = document.getElementById('resultsSection');
    const canvas = await html2canvas(element, {
      scale: 2, // Bättre upplösning
      useCORS: true,
      logging: false
    });
    
    const data = canvas.toDataURL('image/png');
    
    const pdf = new window.jspdf.jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    // Beräkna dimensioner för att passa på A4
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = canvas.height * imgWidth / canvas.width;
    
    pdf.addImage(data, 'PNG', 0, 0, imgWidth, imgHeight);
    pdf.save('Avgiftsberakning-Vallentuna.pdf');
  } catch (error) {
    console.error('PDF generation error:', error);
    alert('Ett fel uppstod vid skapande av PDF. Försök igen eller använd utskriftsfunktionen istället.');
  }
}

function updateServiceCost(e) {
  // Denna funktion behålls för bakåtkompatibilitet
  // Den anropas från initializeFormBasedOnService
  console.log('Service value updated:', e.target.value);
}

function validateInput() {
  // Validera civilstånd
  const civilStatusChecked = document.querySelector('input[name="civilstand"]:checked');
  if (!civilStatusChecked) {
    alert('Civilstånd är inte valt.');
    return false;
  }
  // Check if married and validate partner's age and income
  if (civilStatusChecked.value === 'gift') {
  // Check if the age for partner is selected
  const partnerAgeSelected = document.querySelector('input[name="alder_partner"]:checked');
    if (!partnerAgeSelected) {
      alert('Åldersgrupp för partner är inte vald.');
      return false;
    }
  // Check if partner's income is filled
  const partnerNetIncome = document.getElementById('partnerNettoinkomst').value;
    if (!partnerNetIncome) {
      alert('Inkomstuppgifter för partner är inte ifyllda.');
      return false;
    }
  }
  // Validera ålder
  const ageChecked = document.querySelector('input[name="alder"]:checked');
    if (!ageChecked) {
      alert('Åldersgrupp är inte vald.');
      return false;
    }
  // Check if boendeform is selected
  const boendeformChecked = document.querySelector('input[name="boendeform"]:checked');
    if (!boendeformChecked) {
      alert('Boendeform är inte vald.');
      return false;
    }
  // Check for 'hyres/bostadsrätt' specific fields
  if (boendeformChecked.value === 'hyres/bostadsratt') {
  const hyraPerManad = document.getElementById('hyraPerManad').value;
    if (!hyraPerManad) {
      alert('Hyra/avgift per månad är inte ifylld.');
      return false;
    }
  // Check if hushållsel choice is made
  const hushallselValue = document.querySelector('input[name="hushallsel"]:checked');
    if (!hushallselValue) {
      alert('Vänligen ange om hushållsel ingår i hyran.');
      return false;
  }
    if (hushallselValue.value === 'nej') {
      const ytaForEl = document.getElementById('ytaForEl').value;
      if (!ytaForEl) {
        alert('Yta i kvm för elberäkning är inte ifylld.');
        return false;
      }
    }
  }
  // Specifika kontroller för egen bostadsfastighet
  if (boendeformChecked.value === 'egen_bostadsfastighet') {
  const taxeringsvarde = document.getElementById('taxeringsvarde').value;
  const yta = document.getElementById('yta').value;
  const ranteutgiftPerAr = document.getElementById('ranteutgiftPerAr').value;
    if (!taxeringsvarde || !yta || !ranteutgiftPerAr) {
      alert('Alla uppgifter för egen bostadsfastighet är inte ifyllda.');
      return false;
    }
  }
  // Validera ekonomiinformation
  const nettoinkomst = document.getElementById('nettoinkomst').value;
  if (!nettoinkomst) {
    alert('Nettoinkomst är inte korrekt ifylld.');
    return false;
  }
    // Validering för matlåda
    const matladaChecked = document.querySelector('input[name="matlåda"]:checked')?.value;
    if (matladaChecked === 'ja') {
      const antalMatlador = document.getElementById('AntalMatlådor').value;
      if (!antalMatlador) {
        alert('Du har valt att du vill ha matlåda, men inte angett hur många.');
        return false;
      }
    }
    
    // Kontrollera om någon servicetyp är vald
    const serviceBehovChecked = document.querySelector('input[name="servicebehov"]:checked');
    if (!serviceBehovChecked) {
      alert('Vänligen välj typ av hjälp i hemmet.');
      return false;
    }
    
  return true; // Alla valideringar godkända
}
