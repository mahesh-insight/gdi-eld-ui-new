import { atom } from 'recoil';
import { localStorageEffect, sessionStorageEffect } from './atomStorage';


//Logged in state
const isLoggedInState = atom ({
  key: 'isLoggedInState',
  default: false,
  effects: [
    localStorageEffect('logged_in')
  ]
});

//user state
const userState = atom({
  key: 'userState',
  default: [{
    userID: "XX12345",
    role: "",
    isImpersonated: "",
    isSuperUser: "",
    firstName: "",
    lastName: "",
    haveTargetedSoldTos: "",
    soldToList: [{
      soldToName: "",
      soldTo: "",
      soldToID: ""
    }]
  }],
  effects: [
    localStorageEffect('user_data')
  ]
})

//selectedSoldToID
const selectedAccountState  = atom ({
  key: 'selectedAccountState',
  default: [{
    reseller:"",
    soldToID: "",
    soldToName: "",
    soldTo: "",
    ggp: "",
    ggpName:"",
    tenantIds: "",
    //tenantName: "",
    //locale: ""
  }],
  effects: [
    localStorageEffect('account_selection')
  ]
});



//customerSearch autocomplete
const customerSearchState = atom({
    key: 'customerSearchState',
    default: [
      {
        data: [],//source,
        value: "",
        opened: false,
        suggest: ""
      }
    ]    
  });

  const invoiceMonthState = atom({
    key: 'invoiceMonths',
    // default:[
    //   {
    //     text:"",
    //     date:"",
    //     value:""
    //   }
    // ]
    default: []
  })

  const loginResponseState = atom({
    key: 'loginResponseState',
    default: [{
      soldToID: "",
      soldToName: "",
      soldTo: "",
      ggp: "",
      ggpName:"",
      userType: "",
    }],
    effects: [
      localStorageEffect('login_response')
    ]
  });
  

//return
export {
  userState,
  customerSearchState,
  isLoggedInState, 
  selectedAccountState,
  invoiceMonthState,
  loginResponseState
}