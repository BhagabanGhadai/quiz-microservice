const { CREATE_QUIZ_SECTION_ADMIN, EDIT_QUIZ_SECTION_ADMIN, GET_QUIZ_SECTION_ADMIN, GET_SINGLE_QUIZ_SECTION_ADMIN, DELETE_QUIZ_SECTION_ADMIN,
    ADD_PAGE_QUIZ_ADMIN, GET_QUIZ_PAGE_LIST_ADMIN, GET_SINGLE_PAGE_QUIZ_ADMIN, EDIT_PAGE_QUIZ_ADMIN, DELETE_PAGE_QUIZ_ADMIN,DELETE_SINGLE_SUBMISSION,DELETE_BULK__SUBMISSION,
    ADD_QUIZ_QUESTION_ADMIN, PUBLISH_QUIZ_SECTION_ADMIN, DELETE_QUIZ_QUESTION_OPTION_ADMIN, DELETE_QUIZ_QUESTION_ADMIN,GET_QUIZ_BY_ID,DELETE_BULK_RESULT,DELETE_SINGLE_RESULT,
    EDIT_QUIZ_QUESTION_OPTION_ADMIN, EDIT_QUIZ_QUESTION_ADMIN, ADD_QUIZ_QUESTION_OPTIONS_ADMIN, GET_QUIZ_QUESTION_LIST_ADMIN, GET_SINGLE_QUIZ_QUESTION_ADMIN,
    GET_QUIZ_QUESTION_OPTION_LIST_ADMIN, GET_SINGLE_QUIZ_QUESTION_OPTION_ADMIN, SETUP_QUIZ_STUDENT, ADD_QUIZ_STUDENT_RESPONSE, SUBMIT_QUIZ_STUDENT_RESPONSE,DELETE_SINGLE_QUIZ_RESPONSE,
    GET_SUBMISSION_LIST_ADMIN, ADD_BULK_QUIZ_QUESTION_OPTIONS_ADMIN, GET_SINGLE_QUIZ_PUBLIC, BULK_QUIZ_DELETE,GET_QUIZ_STUDENT_RESPONSE,VIEW_QUIZ_RESULTS_STUDENT,PUBLISH_QUIZ_BULK_ADMIN,
    ADD_QUIZ_IMAGE_ADMIN, ADD_MULTIPLE_QUIZ_IMAGE_ADMIN, GET_IMAGE_LIST_ADMIN, GET_SPECIFIC_IMAGE_ADMIN, DELETE_IMAGE_ADMIN,LOGIN_ADMIN,UPDATE_SUBJECTIVE_MARKS,GET_ONLY_TOTAL_MARKS_OF_USERS_ADMIN } = require('./controllers/quiz.controller')

const router = require('express').Router()
const { UploadFile } = require('./services/multer.mw')
const { IS_AUTHENTICATED } = require('./services/auth.mw')

router.get('/test', (req, res) => {
    console.log(req)
    return res.status(200).json({
        "message": "success"
    })
})
router.post('/login',[
    LOGIN_ADMIN
])
router.post('/quiz', [
    IS_AUTHENTICATED,
    CREATE_QUIZ_SECTION_ADMIN
]);
router.get('/quiz', [
    IS_AUTHENTICATED,
    GET_SINGLE_QUIZ_SECTION_ADMIN
]);
router.get('/single-quiz', [
    IS_AUTHENTICATED,
    GET_QUIZ_BY_ID
]);
router.get('/quiz/list', [
    IS_AUTHENTICATED,
    GET_QUIZ_SECTION_ADMIN
]);
router.patch('/quiz', [
    IS_AUTHENTICATED,
    EDIT_QUIZ_SECTION_ADMIN
]);
router.delete('/quiz', [
    IS_AUTHENTICATED,
    DELETE_QUIZ_SECTION_ADMIN
]);
router.post('/quiz/publish', [
    IS_AUTHENTICATED,
    PUBLISH_QUIZ_SECTION_ADMIN
])
router.post('/quiz/bulk/publish', [
    IS_AUTHENTICATED,
    PUBLISH_QUIZ_BULK_ADMIN
])
router.delete('/quiz/bulk', [
    IS_AUTHENTICATED,
    BULK_QUIZ_DELETE
]);


router.post('/page', [
    IS_AUTHENTICATED,
    ADD_PAGE_QUIZ_ADMIN
]);
router.get('/page', [
    IS_AUTHENTICATED,
    GET_SINGLE_PAGE_QUIZ_ADMIN
]);
router.get('/page/list', [
    IS_AUTHENTICATED,
    GET_QUIZ_PAGE_LIST_ADMIN
]);
router.patch('/page', [
    IS_AUTHENTICATED,
    EDIT_PAGE_QUIZ_ADMIN
]);
router.delete('/page', [
    IS_AUTHENTICATED,
    DELETE_PAGE_QUIZ_ADMIN
]);


router.post('/quiz/question', [
    IS_AUTHENTICATED,
    UploadFile.fields([{ name: 'question_image', maxCount: 1 }]),
    ADD_QUIZ_QUESTION_ADMIN
]);
router.get('/quiz/question', [
    IS_AUTHENTICATED,
    GET_SINGLE_QUIZ_QUESTION_ADMIN
]);
router.get('/quiz/question/list', [
    IS_AUTHENTICATED,
    GET_QUIZ_QUESTION_LIST_ADMIN
]);
router.patch('/quiz/question', [
    IS_AUTHENTICATED,
    UploadFile.fields([{ name: 'question_image', maxCount: 1 }]),
    EDIT_QUIZ_QUESTION_ADMIN
]);
router.delete('/quiz/question', [
    IS_AUTHENTICATED,
    DELETE_QUIZ_QUESTION_ADMIN]);


router.post('/quiz/question/option', [
    IS_AUTHENTICATED,
    UploadFile.fields([{ name: 'option_image', maxCount: 1 }]),
    ADD_QUIZ_QUESTION_OPTIONS_ADMIN
]);
router.post('/quiz/question/option/bulk', [
    IS_AUTHENTICATED,
    UploadFile.fields([{ name: 'option_image', maxCount: 5 }]),
    ADD_BULK_QUIZ_QUESTION_OPTIONS_ADMIN
]);
router.get('/quiz/question/option', [
    IS_AUTHENTICATED,
    GET_SINGLE_QUIZ_QUESTION_OPTION_ADMIN
]);
router.get('/quiz/question/option/list', [
    IS_AUTHENTICATED,
    GET_QUIZ_QUESTION_OPTION_LIST_ADMIN
]);
router.patch('/quiz/question/option', [
    IS_AUTHENTICATED,
    UploadFile.fields([{ name: 'option_image', maxCount: 1 }]),
    EDIT_QUIZ_QUESTION_OPTION_ADMIN
]);
router.delete('/quiz/question/option', [
    IS_AUTHENTICATED,
    DELETE_QUIZ_QUESTION_OPTION_ADMIN
]);


router.post('/quiz/setup', [
    IS_AUTHENTICATED,
    SETUP_QUIZ_STUDENT
])
router.get('/quiz/start', [
    IS_AUTHENTICATED,
    GET_SINGLE_QUIZ_PUBLIC
])
router.patch('/quiz/response/add', [
    IS_AUTHENTICATED,
    ADD_QUIZ_STUDENT_RESPONSE
])
router.delete('/quiz/response/deselect',[
    IS_AUTHENTICATED,
    DELETE_SINGLE_QUIZ_RESPONSE
])
router.post('/quiz/response/submit', [
    IS_AUTHENTICATED,
    SUBMIT_QUIZ_STUDENT_RESPONSE
])
router.get('/quiz/response/list', [
    IS_AUTHENTICATED,
    GET_SUBMISSION_LIST_ADMIN
])
router.get('/quiz/response', [
    IS_AUTHENTICATED,
    GET_QUIZ_STUDENT_RESPONSE
])
router.patch('/quiz/add-subjective-marks', [
    IS_AUTHENTICATED,
    UPDATE_SUBJECTIVE_MARKS
])
router.get('/quiz/result',[
    IS_AUTHENTICATED,
    VIEW_QUIZ_RESULTS_STUDENT
])
router.delete('/quiz/result',[
    IS_AUTHENTICATED,
    DELETE_SINGLE_RESULT
])
router.post('/quiz/result/bulk',[
    IS_AUTHENTICATED,
    DELETE_BULK_RESULT
])
router.delete('/quiz/submission',[
    IS_AUTHENTICATED,
    DELETE_SINGLE_SUBMISSION
])
router.post('/quiz/submission',[
    IS_AUTHENTICATED,
    DELETE_BULK__SUBMISSION
])
router.get('/quiz/pdf-view',[
    IS_AUTHENTICATED,
    GET_ONLY_TOTAL_MARKS_OF_USERS_ADMIN
])
router.post('/quiz/media', [
    IS_AUTHENTICATED,
    UploadFile.fields([{ name: 'question_image', maxCount: 1 }]),
    ADD_QUIZ_IMAGE_ADMIN
]);
router.post('/quiz/media/bulk', [
    IS_AUTHENTICATED,
    UploadFile.fields([{ name: 'question_image', maxCount: 10 }]),
    ADD_MULTIPLE_QUIZ_IMAGE_ADMIN
]);
router.get('/quiz/media', [
    IS_AUTHENTICATED,
    GET_SPECIFIC_IMAGE_ADMIN
]);
router.get('/quiz/media/list', [
    IS_AUTHENTICATED,
    GET_IMAGE_LIST_ADMIN
]);
router.delete('/quiz/media', [
    IS_AUTHENTICATED,
    DELETE_IMAGE_ADMIN
]);

module.exports.AppRoutes = router