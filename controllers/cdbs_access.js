

var Sybase = require('sybase'),
      db = new Sybase('trestakk', 2725, 'cdbs', 'cdbs_pa', 'i2wberger');
 

db.connect(function (err) {
  //if (err) return console.log(err);
  
  console.log('db status')
  console.log(db)
  
  db.query('select count(*) ct from facility', function (err, data) {
    if (err) console.log(err);
    
    console.log(data);
 
    db.disconnect();
 
  });
});
