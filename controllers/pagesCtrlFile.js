exports.shopCtrlFunction = (req, res) => {
    res.render('users/shop', {
        layout:'main'
    });
}

exports.signupCtrlFunction = (req, res) => {
    res.render('users/signup',{
        layout:''
    });
}

exports.loginCtrlFunction = (req, res) => {
    res.render('users/login', {
        layout:'main'
    });
}

exports.privacyCtrlFunction = (req, res) => {
    res.render('users/privacypolicy', {
        layout:'main'
    });
}

exports.returnCtrlFunction = (req, res) => {
    res.render('users/returnpolicy', {
        layout:'main'
    });
}

exports.deliveryCtrlFunction = (req, res) => {
    res.render('users/deliverypolicy', {
        layout:'main'
    });
}


exports.aboutCtrlFunction = (req, res) => {
    res.render('users/about',{
        layout:'main'
    });
}

exports.contactCtrlFunction = (req, res) => {
    res.render('users/contact',{
        layout:'main'
    });
}

exports.tosCtrlFunction = (req, res) => {
    res.render('users/termsofservice',{
        layout:'main'
    });
}

exports.wishlistCtrlFunction = (req, res) => {
    res.render('users/wishlist',{
        layout:'main'
    });
}


