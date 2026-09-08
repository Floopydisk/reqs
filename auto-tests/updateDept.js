const mongoose = require('mongoose');
require('dotenv').config();

const mongoUri = process.env.MONGODB_URI;
console.log('MongoDB URI:', mongoUri ? 'Found' : 'Not found');

mongoose.connect(mongoUri)
  .then(async () => {
    try {
      const departmentSchema = new mongoose.Schema({
        name: String,
        code: String,
        head: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        }
      });
      const Department = mongoose.model('Department', departmentSchema);
      
      // Get the department
      const department = await Department.findById('68d1adfa494a90816679f116');
      console.log('Before update - Department:', {
        id: department._id.toString(),
        name: department.name,
        headId: department.head ? department.head.toString() : 'null'
      });
      
      // Update department to set the head to your user ID
      const yourUserId = '68d27ff4cc5f696845636def'; // From your /auth/me response
      
      // Update the department with your user ID as head
      const updatedDepartment = await Department.findByIdAndUpdate(
        '68d1adfa494a90816679f116',
        { head: yourUserId },
        { new: true }
      );
      
      console.log('After update - Department:', {
        id: updatedDepartment._id.toString(),
        name: updatedDepartment.name,
        headId: updatedDepartment.head ? updatedDepartment.head.toString() : 'null'
      });
      
      console.log('Update complete!');
    } catch(err) {
      console.error('Error:', err);
    } finally {
      mongoose.connection.close();
    }
  })
  .catch(err => {
    console.error('Connection error:', err);
    process.exit(1);
  });