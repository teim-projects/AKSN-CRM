import * as Yup from "yup";

export const LeadSchema = Yup.object().shape({
  contactNumber: Yup.string()
    .required("Contact number is required")
    .matches(/^[0-9]{10}$/, "Enter valid 10 digit number"),

  clientName: Yup.string().when("customerId", {
    is: (val) => !val,
    then: (schema) => schema.required("Customer name is required"),
  }),

  email: Yup.string().email("Invalid email").nullable(),

  secondary_email: Yup.string().email("Invalid secondary email").nullable(),

  date: Yup.string().required("Enquiry date is required"),
  
  leadSource: Yup.string().required("Lead source is required"),

  status: Yup.string().required("Status is required"),

  projectName: Yup.string().nullable(),
  projectAddress: Yup.string().nullable(),
  hvacApplication: Yup.string().nullable(),
  tonCapacity: Yup.string().nullable(),
  remarks: Yup.string().nullable(),
});
