function ContactItem(userID){
    this.hasError = false;
    this.userID = userID;
    this.favorite;
    this.firstName;
    this.middleName;
    this.lastName;
    this.phoneNumbers;
    this.emails;
}

ContactItem.prototype.getDBReadyItem = ()=>{
    var x = {

    };
    return x;
};