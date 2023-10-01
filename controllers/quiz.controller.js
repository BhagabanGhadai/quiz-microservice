const { _throw500, _throw400, _throw404, _throw400Err } = require("../services/errorHandler")
const { UPLOAD_IMAGE, UPLOAD_MULTIPLE_IMAGE } = require("../services/cloudinary")
const Quiz = require("../models/quiz")
const QuizQuestions = require("../models/quiz_question")
const QuizQuestionOptions = require("../models/quiz_options");
const QuizSubmissions = require("../models/quiz_submission")
const QuizResponse = require("../models/quiz_response")
const QuizPage = require("../models/quiz_page")
const QuizImage = require("../models/quiz_images")
const QuizClone = require("../models/quiz_clone")
const { AdminModel } = require("../models/quiz_auth");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt")
const moment = require('moment')
const mongoose = require('mongoose')
const { env } = require("../env")

/**
 * These api are used to create,edit,getone,get list of quiz and delete quiz by admin
 * @param {*} req 
 * @param {*} res 
 */
exports.CREATE_QUIZ_SECTION_ADMIN = async (req, res) => {

    let quiz = new Quiz(req.body)
    quiz.validate().then(async (_noerr) => {
        quiz.save().then(async (saved_quiz) => {
            return res.status(200).send({ msg: "quiz added successful", data: saved_quiz })
        }).catch(err => {
            return _throw400(res, err)
        })
    }).catch(err => {
        return _throw400(res, err)
    })
}

exports.EDIT_QUIZ_SECTION_ADMIN = async (req, res) => {
    if (!req.query.quiz_id) {
        return _throw400(res, "Quiz ID is required!")
    }

    let quiz = null
    try {
        quiz = await Quiz.findOne({ "_id": req.query.quiz_id }).exec()
    } catch (error) {
        return _throw500(res, error)
    }

    if (!quiz) {
        return _throw400(res, "Quiz not found!")
    }
    let dead_line = null;
    // if (req.body.start_time) {
    //     dead_line = moment(req.body.start_time)
    // } else {
    //     dead_line = moment(quiz.start_time)
    // }
    // if (req.body.published) {
    //     let currentdate = moment(Date.now())
    //     let deadline = dead_line
    //     if (currentdate > deadline) {
    //         return _throw400(res, "publish after start time is not allowed!")
    //     }
    // }

    let updated_quiz = null
    try {
        updated_quiz = await Quiz.findOneAndUpdate({ "_id": req.query.quiz_id }, req.body, { new: true }).exec()
    } catch (error) {
        return _throw500(res, error)
    }

    return res.status(200).send({ message: "update successful", data: updated_quiz })
}

exports.DELETE_QUIZ_SECTION_ADMIN = async (req, res) => {
    if (!req.query.quiz_id) {
        return _throw400(res, "Quiz ID is required!")
    }

    let quiz = null
    try {
        quiz = await Quiz.findOne({ "_id": req.query.quiz_id }).exec()
    } catch (error) {
        return _throw500(res, error)
    }

    if (!quiz) {
        return _throw400(res, "Quiz not found!")
    }

    let delete_submissions = null
    try {
        delete_submissions = await QuizSubmissions.deleteMany({ "quiz_id": req.query.quiz_id }).exec()
    } catch (error) {
        return _throw500(res, error)
    }

    let delete_response = null
    try {
        delete_response = await QuizResponse.deleteMany({ "quiz_id": req.query.quiz_id }).exec()
    } catch (error) {
        return _throw500(res, error)
    }

    let deleted_page = null
    try {
        deleted_page = await QuizPage.deleteMany({ "quiz_id": req.query.quiz_id }).exec()
    } catch (error) {
        return _throw500(res, error)
    }

    let deleted_questions = null
    try {
        deleted_questions = await QuizQuestions.deleteMany({ "quiz_id": req.query.quiz_id }).exec()
    } catch (error) {
        return _throw500(res, error)
    }

    let deleted_options = null
    try {
        deleted_options = await QuizQuestionOptions.deleteMany({ "quiz_id": req.query.quiz_id }).exec()
    } catch (error) {
        return _throw500(res, error)
    }

    let deleted_quiz = null
    try {
        deleted_quiz = await Quiz.findOneAndDelete({ "_id": req.query.quiz_id }).exec()
    } catch (error) {
        return _throw500(res, error)
    }

    return res.status(202).json({ message: "deletion successful", data: deleted_quiz })
}

exports.GET_QUIZ_SECTION_ADMIN = async (req, res) => {

    let query = [
        {
            $sort: { createdAt: -1 }
        }
    ]
    let page = 1
    if (req.query.page) {
        page = parseInt(req.query.page)
    }

    let page_size = 10
    if (req.query.page_size) {
        page_size = parseInt(req.query.page_size)
    }

    if (req.query.published == "true") {
        query.push({ $match: { published: true } })
    } else if (req.query.published == "false") {
        query.push({ $match: { published: false } })
    }
    if (req.query.search) {
        query.push({ $match: { "title": { $regex: ".*" + req.query.search + ".*", $options: "i" } } })
    }
    query.push({
        $lookup: {
            from: "quiz-submissions",
            let: { quizId: "$_id" },
            pipeline: [
                {
                    $match: {
                        $expr: { $eq: ["$quiz_id", "$$quizId"] },
                        is_submitted: true
                    },
                },
                {
                    $group: {
                        _id: null,
                        count: { $sum: 1 },
                    },
                },
            ],
            as: "participantCount",
        },
    });
    query.push({
        $addFields: {
            participantCount: { $ifNull: [{ $arrayElemAt: ["$participantCount.count", 0] }, 0] },
        },
    });
    query.push({
        $facet: {
            "metadata": [{ "$count": "total_records" }],
            "records": [{ "$skip": (page - 1) * page_size }, { "$limit": page_size }],
        }
    })
    let quizes = null
    try {
        quizes = await Quiz.aggregate(query).exec()
    } catch (error) {
        return _throw500(res, error)
    }

    return res.status(200).json({ message: "quiz list fetched successful", data: quizes })

}

exports.GET_SINGLE_QUIZ_SECTION_ADMIN = async (req, res) => {
    if (!req.query.quiz_id) {
        return _throw400(res, "Quiz ID is required!")
    }

    let quiz = null
    let query = {}
    query["_id"] = new mongoose.Types.ObjectId(req.query.quiz_id)

    try {
        quiz = await Quiz.aggregate([
            {
                $match: query
            },
            {
                $lookup: {
                    from: "quiz-page",
                    let: {
                        "quiz_id": "$_id"
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ["$quiz_id", "$$quiz_id"]
                                }
                            }
                        },
                        {
                            $lookup: {
                                from: "quiz-questions",
                                let: {
                                    "page_id": "$_id"
                                },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: {
                                                $eq: ["$quiz_page_id", "$$page_id"]
                                            }
                                        }
                                    },
                                    {
                                        $lookup: {
                                            from: "quiz-question-options",
                                            let: {
                                                "question_id": "$_id"
                                            },
                                            pipeline: [
                                                {
                                                    $match: {
                                                        $expr: {
                                                            $eq: ["$question_id", "$$question_id"]
                                                        }
                                                    }
                                                },
                                                {
                                                    $project: {
                                                        createdAt: 0,
                                                        updatedAt: 0
                                                    }
                                                }
                                            ],
                                            as: "options"
                                        }
                                    },
                                ],
                                as: "questions"
                            }
                        }
                    ],
                    as: "pages"
                }
            }
        ]).exec()
    } catch (error) {
        return _throw500(res, error)
    }
    if (!quiz.length) {
        return _throw404(res, 'no such quiz found')
    }
    return res.status(200).json(quiz)
}

exports.PUBLISH_QUIZ_SECTION_ADMIN = async (req, res) => {
    if (!req.query.quiz_id) {
        return _throw400(res, "Quiz ID is required!")
    }

    let quiz = null
    try {
        quiz = await Quiz.findOne({ "_id": req.query.quiz_id }).exec()
    } catch (error) {
        return _throw500(res, error)
    }

    if (!quiz) {
        return _throw400(res, "Quiz not found!")
    }

    if (quiz.published) {
        return _throw400(res, "Quiz already published!")
    }

    // let currentdate = moment(Date.now())
    // let deadline = moment(quiz.start_time)

    // if (currentdate > deadline) {
    //     return _throw400(res, "publish after start time is not allowed!")
    // }

    let updated_quiz = null
    try {
        updated_quiz = await Quiz.findOneAndUpdate({ "_id": req.query.quiz_id }, { $set: { published: true } }, { new: true }).exec()
    } catch (error) {
        return _throw500(res, error)
    }

    return res.status(200).json(updated_quiz)
}

exports.PUBLISH_QUIZ_BULK_ADMIN = async (req, res) => {
    if (!req.body.quiz_ids || !Array.isArray(req.body.quiz_ids) || req.body.quiz_ids.length === 0) {
        return _throw400(res, "Array of Quiz IDs is required!");
    }

    const publishedQuizzes = [];
    const errorQuizzes = [];

    for (const quizId of req.body.quiz_ids) {
        let quiz = null;
        try {
            quiz = await Quiz.findOne({ "_id": quizId }).exec();
        } catch (error) {
            errorQuizzes.push({ quizId, error: error.message });
            continue;
        }

        if (!quiz) {
            errorQuizzes.push({ quizId, error: "Quiz not found!" });
            continue;
        }

        if (quiz.published) {
            errorQuizzes.push({ quizId, error: "Quiz already published!" });
            continue;
        }

        // let currentdate = moment(Date.now());
        // let deadline = moment(quiz.start_time);

        // if (currentdate > deadline) {
        //     errorQuizzes.push({ quizId, error: "publish after start time is not allowed!" });
        //     continue;
        // }

        try {
            const updated_quiz = await Quiz.findOneAndUpdate(
                { "_id": quizId },
                { $set: { published: true } },
                { new: true }
            ).exec();
            publishedQuizzes.push(updated_quiz);
        } catch (error) {
            errorQuizzes.push({ quizId, error: error.message });
            continue;
        }
    }

    const response = {
        publishedQuizzes,
        errorQuizzes,
    };

    return res.status(200).json(response);
}

exports.BULK_QUIZ_DELETE = async (req, res) => {
    let quiz_id_list = req.body.quiz_id_list
    if (!quiz_id_list.length) {
        return _throw400(res, 'no id found')
    }
    for (let i = 0; i < quiz_id_list.length; i++) {
        let deleted_page = null
        try {
            deleted_page = await QuizPage.deleteMany({ "quiz_id": quiz_id_list[i] }).exec()
        } catch (error) {
            return _throw500(res, error)
        }

        let deleted_questions = null
        try {
            deleted_questions = await QuizQuestions.deleteMany({ "quiz_id": quiz_id_list[i] }).exec()
        } catch (error) {
            return _throw500(res, error)
        }

        let deleted_options = null
        try {
            deleted_options = await QuizQuestionOptions.deleteMany({ "quiz_id": req.query.quiz_id }).exec()
        } catch (error) {
            return _throw500(res, error)
        }

        let delete_submissions = null
        try {
            delete_submissions = await QuizSubmissions.deleteMany({ "quiz_id": req.query.quiz_id }).exec()
        } catch (error) {
            return _throw500(res, error)
        }
    
        let delete_response = null
        try {
            delete_response = await QuizResponse.deleteMany({ "quiz_id": req.query.quiz_id }).exec()
        } catch (error) {
            return _throw500(res, error)
        }

        let deleted_quiz = null
        try {
            deleted_quiz = await Quiz.findOneAndDelete({ "_id": quiz_id_list[i] }).exec()
        } catch (error) {
            return _throw500(res, error)
        }

    }
    return res.status(200).send('quiz deleted successful')
}

exports.GET_QUIZ_BY_ID = async (req, res) => {
    if (!req.query.quiz_id) {
        return _throw400(res, "Quiz ID is required!")
    }
    let quiz = null;
    try {
        quiz = await Quiz.findById(req.query.quiz_id)
    } catch (error) {
        return _throw500(res, error)
    }
    if (!quiz) {
        return _throw404(res, 'no such quiz found')
    }
    return res.status(200).json(quiz)
}
/**
 * These api are used to add,delete,edit and retrive page inside quiz
 * @param {*} req 
 * @param {*} res 
 * @returns {}
 */
exports.ADD_PAGE_QUIZ_ADMIN = async (req, res) => {
    if (!req.body.quiz_id) {
        return _throw400(res, 'quiz id is required')
    }
    let quiz = new QuizPage(req.body)
    quiz.validate().then(async (_noerr) => {
        quiz.save().then(saved_quiz => {
            return res.status(200).send({ msg: "page added successful", data: saved_quiz })
        }).catch(err => {
            return _throw400(res, err)
        })
    }).catch(err => {
        return _throw400(res, err)
    })
}

exports.GET_SINGLE_PAGE_QUIZ_ADMIN = async (req, res) => {
    if (!req.query.quiz_page_id) {
        return _throw400(res, "Quiz Page ID is required!")
    }

    let quiz = null
    try {
        quiz = await QuizPage.aggregate([
            {
                $match: { "_id": new mongoose.Types.ObjectId(req.query.quiz_page_id) }
            },
            {
                $lookup: {
                    from: "quiz-questions",
                    let: {
                        "page_id": "$_id"
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ["$quiz_page_id", "$$page_id"]
                                }
                            }
                        },
                        {
                            $lookup: {
                                from: "quiz-question-options",
                                let: {
                                    "question_id": "$_id"
                                },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: {
                                                $eq: ["$question_id", "$$question_id"]
                                            }
                                        }
                                    },
                                    {
                                        $project: {
                                            is_correct: 0,
                                            marks: 0,
                                            createdAt: 0,
                                            updatedAt: 0
                                        }
                                    }
                                ],
                                as: "options"
                            }
                        },
                    ],
                    as: "questions"
                }
            }
        ]).exec()
    } catch (error) {
        return _throw500(res, error)
    }

    if (!quiz.length) {
        return _throw400(res, "Quiz page not found!")
    }
    let quiz_page_list = await QuizPage.find({ quiz_id: quiz[0].quiz_id }).sort({ sequence_no: 1 })
    let number_of_pages = quiz_page_list.findIndex((item) => item._id.toString() == req.query.quiz_page_id);
    let total_question_last_index = 0;
    for (let i = 0; i < number_of_pages; i++) {
        let total_records = await QuizPage.aggregate([
            {
                $match: { "_id": quiz_page_list[i]["_id"] }
            },
            {
                $lookup: {
                    from: "quiz-questions",
                    let: {
                        "page_id": "$_id"
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ["$quiz_page_id", "$$page_id"]
                                }
                            }
                        }
                    ],
                    as: "questions"
                }
            },
            {
                $addFields: { "number_of_records": { "$size": "$questions" } }
            },
            {
                $project: { number_of_records: 1 }
            }
        ])
        total_question_last_index += total_records[0]['number_of_records']
    }
    quiz[0].total_question_last_index = total_question_last_index
    return res.status(200).send(quiz)
}

exports.GET_QUIZ_PAGE_LIST_ADMIN = async (req, res) => {
    if (!req.query.quiz_id) {
        return _throw400(res, "Quiz ID is required!")
    }
    let quizes = null
    try {
        quizes = await QuizPage.aggregate([
            {
                $match: { "quiz_id": new mongoose.Types.ObjectId(req.query.quiz_id) }
            }
        ]).exec()
    } catch (error) {
        return _throw500(res, error)
    }

    return res.status(200).send({ message: "quiz page list fetched successful", data: quizes })

}

exports.EDIT_PAGE_QUIZ_ADMIN = async (req, res) => {
    if (!req.query.quiz_page_id) {
        return _throw400(res, "Quiz Page ID is required!")
    }

    let quiz = null
    try {
        quiz = await QuizPage.findOne({ "_id": req.query.quiz_page_id }).exec()
    } catch (error) {
        return _throw500(res, error)
    }

    if (!quiz) {
        return _throw400(res, "Quiz page not found!")
    }
    let updated_quiz = null
    try {
        updated_quiz = await QuizPage.findOneAndUpdate({ "_id": req.query.quiz_page_id }, req.body, { new: true }).exec()
    } catch (error) {
        return _throw500(res, error)
    }

    return res.status(200).send(updated_quiz)
}

exports.DELETE_PAGE_QUIZ_ADMIN = async (req, res) => {
    if (!req.query.quiz_page_id) {
        return _throw400(res, "Quiz Page ID is required!")
    }

    let quiz = null
    try {
        quiz = await QuizPage.findOne({ "_id": req.query.quiz_page_id }).exec()
    } catch (error) {
        return _throw500(res, error)
    }

    if (!quiz) {
        return _throw400(res, "Quiz page not found!")
    }
    let deleted_questions = null
    try {
        deleted_questions = await QuizQuestions.deleteMany({ "quiz_id": quiz.quiz_id, "quiz_page_id": req.query.quiz_page_id }).exec()
    } catch (error) {
        return _throw500(res, error)
    }

    let deleted_options = null
    try {
        deleted_options = await QuizQuestionOptions.deleteMany({ "quiz_id": quiz.quiz_id, "question_id": deleted_questions._id }).exec()
    } catch (error) {
        return _throw500(res, error)
    }
    let deleted_quiz_page = null
    try {
        deleted_quiz_page = await QuizPage.findOneAndDelete({ "_id": req.query.quiz_page_id }).exec()
    } catch (error) {
        return _throw500(res, error)
    }

    return res.status(200).json(deleted_quiz_page)
}
/**
 * These api are used to add,delete,edit and retrive questions inside quiz
 * @param {*} req 
 * @param {*} res 
 * @returns {}
 */
exports.ADD_QUIZ_QUESTION_ADMIN = async (req, res) => {
    if (!req.body["quiz_id"]) {
        return _throw400(res, "Quiz ID is required!");
    }

    let quiz = null;
    try {
        quiz = await Quiz.findOne({ "_id": req.body["quiz_id"] }).exec();
    } catch (error) {
        return _throw500(res, error);
    }

    if (!quiz) {
        return _throw400(res, "Quiz not found!");
    }

    if (req.files && req.files["question_image"]) {
        let upload = await UPLOAD_IMAGE(req.files.question_image[0]);
        req.body.question_image = upload.secure_url;
    }

    try {
        await validateAndSaveQuestionWithOptions(req.body, res);
    } catch (error) {
        return _throw400(res, error);
    }
};

async function validateAndSaveQuestionWithOptions(questionData, res) {
    try {
        await new QuizQuestions(questionData).validate();

        const savedQuestion = await new QuizQuestions(questionData).save();

        if (questionData.options && questionData.options.length) {
            for (let i = 0; i < questionData.options.length; i++) {
                let option = questionData.options[i];
                let data = {
                    quiz_id: questionData.quiz_id,
                    question_id: savedQuestion._id,
                    option_text: option.option_text,
                    is_correct: option.is_correct,
                    marks: option.marks,
                };
                let options = await QuizQuestionOptions.create(data);

                if (options.is_correct) {
                    await QuizQuestions.findOneAndUpdate(
                        { "_id": savedQuestion._id },
                        { $set: { answers: options._id } },
                        { new: true }
                    ).exec();
                }
            }
        }

        return res.status(200).json({ message: "question added successful", data: savedQuestion });
    } catch (error) {
        throw error;
    }
}


exports.EDIT_QUIZ_QUESTION_ADMIN = async (req, res) => {
    if (!req.query.quiz_id) {
        return _throw400(res, "Quiz ID is required!")
    }

    let quiz = null
    try {
        quiz = await Quiz.findOne({ "_id": req.query.quiz_id }).exec()
    } catch (error) {
        return _throw500(res, error)
    }

    if (!quiz) {
        return _throw400(res, "Quiz not found!")
    }

    if (!req.query.question_id) {
        return _throw400(res, "Question ID is required!")
    }

    let question = null
    try {
        question = await QuizQuestions.findOne({ "_id": req.query.question_id }).exec()
    } catch (error) {
        return _throw500(res, error)
    }

    if (!question) {
        return _throw400(res, "Question not found!")
    }

    if (!question.quiz_id === quiz._id) {
        return _throw400(res, "Question does not belong to given quiz!")
    }

    if (req.files && req.files["question_image"]) {
        let upload = await UPLOAD_IMAGE(req.files.question_image[0])
        req.body.question_image = upload.secure_url
    }
    if (req.body.answers && req.body.answers.length) {
        return _throw400(res, `can't update answer`)
    }
    let updated_question = null
    try {
        updated_question = await QuizQuestions.findOneAndUpdate({ "_id": req.query.question_id }, req.body, { new: true })

        const options = req.body.options;
        if (options && options.length) {
            await QuizQuestionOptions.deleteMany({ "question_id": req.query.question_id, 'quiz_id': req.query.quiz_id })
            for (let i = 0; i < options.length; i++) {
                let data = {
                    quiz_id: req.query.quiz_id,
                    question_id: req.query.question_id,
                    option_text: options[i]["option_text"],
                    is_correct: options[i]["is_correct"],
                    marks: options[i]["marks"]
                }
                const question_option = new QuizQuestionOptions(data);
                await question_option.validate();
                const saved_option = await question_option.save();

                if (saved_option.is_correct) {
                    await QuizQuestions.findOneAndUpdate(
                        { _id: req.query.question_id },
                        { $set: { answers: saved_option._id } },
                        { new: true }
                    ).exec();
                }
            };
        }
    } catch (err) {
        return _throw400(res, err);
    }
    return res.status(200).json({ message: "updation successful", data: updated_question })
}

exports.DELETE_QUIZ_QUESTION_ADMIN = async (req, res) => {
    if (!req.query.quiz_id) {
        return _throw400(res, "Quiz ID is required!")
    }

    let quiz = null
    try {
        quiz = await Quiz.findOne({ "_id": req.query.quiz_id }).exec()
    } catch (error) {
        return _throw500(res, error)
    }

    if (!quiz) {
        return _throw400(res, "Quiz not found!")
    }


    if (!req.query.question_id) {
        return _throw400(res, "Question ID is required!")
    }

    let question = null
    try {
        question = await QuizQuestions.findOne({ "_id": req.query.question_id }).exec()
    } catch (error) {
        return _throw500(res, error)
    }

    if (!question) {
        return _throw400(res, "Question not found!")
    }

    if (!question.quiz_id === quiz._id) {
        return _throw400(res, "Question does not belong to given quiz!")
    }

    let delete_options = null
    try {
        delete_options = await QuizQuestionOptions.deleteMany({ "question_id": req.query.question_id }).exec()
    } catch (error) {
        return _throw500(res, error)
    }

    let delete_question = null
    try {
        delete_question = await QuizQuestions.findOneAndDelete({ "_id": req.query.question_id }).exec()
    } catch (error) {
        return _throw500(res, error)
    }

    return res.status(200).json(delete_question)
}

exports.GET_SINGLE_QUIZ_QUESTION_ADMIN = async (req, res) => {
    if (!req.query.quiz_id) {
        return _throw400(res, "Quiz ID is required!")
    }

    let quiz = null
    try {
        quiz = await Quiz.findOne({ "_id": req.query.quiz_id }).exec()
    } catch (error) {
        return _throw500(res, error)
    }

    if (!quiz) {
        return _throw400(res, "Quiz not found!")
    }


    if (!req.query.question_id) {
        return _throw400(res, "Question ID is required!")
    }

    let question = null
    try {
        question = await QuizQuestions.aggregate([
            {
                $match: { "_id": new mongoose.Types.ObjectId(req.query.question_id) }
            },
            {
                $lookup: {
                    from: "quiz-question-options",
                    let: {
                        "question_id": "$_id"
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ["$question_id", "$$question_id"]
                                }
                            }
                        },
                        {
                            $project: {
                                is_correct: 0,
                                marks: 0,
                                createdAt: 0,
                                updatedAt: 0
                            }
                        }
                    ],
                    as: "options"
                }
            }
        ])
    } catch (error) {
        return _throw500(res, error)
    }

    if (!question) {
        return _throw400(res, "Question not found!")
    }

    if (!question[0].quiz_id === quiz._id) {
        return _throw400(res, "Question does not belong to given quiz!")
    }
    return res.status(200).send(question)
}

exports.GET_QUIZ_QUESTION_LIST_ADMIN = async (req, res) => {
    if (!req.query.quiz_id) {
        return _throw400(res, "Quiz ID is required!")
    }
    let pipeline = [
        {
            $sort: { createdAt: 1 }
        }
    ]
    if (req.query.quiz_id) {
        pipeline.push({
            $match: { "quiz_id": new mongoose.Types.ObjectId(req.query.quiz_id) }
        })
    }
    if (req.query.page_id) {
        pipeline.push({
            $match: { "quiz_page_id": new mongoose.Types.ObjectId(req.query.page_id) }
        })
    }
    let quizes = null
    try {
        quizes = await QuizQuestions.aggregate(pipeline).exec()
    } catch (error) {
        return _throw500(res, error)
    }
    if (!quizes.length) {
        return _throw400(res, 'question not found')
    }
    return res.status(200).json(quizes)

}

/**
 * These api are used to add,delete,edit and retrive questions OPTION inside quiz
 * @param {*} req 
 * @param {*} res 
 * @returns {}
 */

exports.ADD_QUIZ_QUESTION_OPTIONS_ADMIN = async (req, res) => {
    if (!req.body["quiz_id"]) {
        return _throw400(res, "Quiz ID is required!")
    }

    if (!req.body["question_id"]) {
        return _throw400(res, "Question ID is required!")
    }

    let quiz = null
    try {
        quiz = await Quiz.findOne({ "_id": req.body["quiz_id"] }).exec()
    } catch (error) {
        return _throw500(res, error)
    }

    if (!quiz) {
        return _throw400(res, "Quiz not found!")
    }

    let question = null
    try {
        question = await QuizQuestions.findOne({ "_id": req.body["question_id"] }).exec()
    } catch (error) {
        return _throw500(res, error)
    }

    if (!question) {
        return _throw400(res, "Question not found!")
    }

    if (!question.quiz_id === quiz._id) {
        return _throw400(res, "Question does not belong to given quiz!")
    }
    if (req.body.is_correct == true) {
        let options = null
        try {
            options = await QuizQuestionOptions.findOne({ "question_id": req.body["question_id"], 'quiz_id': req.body["quiz_id"], 'is_correct': true }).exec()
        } catch (error) {
            return _throw500(res, error)
        }

        if (options) {
            return _throw400(res, "multiple ans can't be true in mcq question")
        }
    }
    if (req.files && req.files["option_image"]) {
        let upload = await UPLOAD_IMAGE(req.files.option_image[0])
        req.body.option_image = upload.secure_url
    }

    let question_option = new QuizQuestionOptions(req.body)
    question_option.validate().then(async (_noerr) => {

        question_option.save().then(async (saved_option) => {
            if (saved_option.is_correct) {
                await QuizQuestions.findOneAndUpdate({ "_id": req.body.question_id }, { $push: { answers: saved_option._id } }, { new: true }).exec()
            }
            return res.status(200).json(saved_option)
        }).catch(err => {
            return _throw400(res, err)
        })

    }).catch(err => {
        return _throw400(res, err)
    })
}

exports.EDIT_QUIZ_QUESTION_OPTION_ADMIN = async (req, res) => {
    if (!req.query.quiz_id) {
        return _throw400(res, "Quiz ID is required!")
    }

    let quiz = null
    try {
        quiz = await Quiz.findOne({ "_id": req.query.quiz_id }).exec()
    } catch (error) {
        return _throw500(res, error)
    }

    if (!quiz) {
        return _throw400(res, "Quiz not found!")
    }

    if (!req.query.question_id) {
        return _throw400(res, "Question ID is required!")
    }

    let question = null
    try {
        question = await QuizQuestions.findOne({ "_id": req.query.question_id }).exec()
    } catch (error) {
        return _throw500(res, error)
    }

    if (!question) {
        return _throw400(res, "Question not found!")
    }

    if (!question.quiz_id === quiz._id) {
        return _throw400(res, "Question does not belong to given quiz!")
    }

    if (!req.query.question_id) {
        return _throw400(res, "Question ID is required!")
    }

    let option = null
    try {
        option = await QuizQuestionOptions.findOne({ "_id": req.query.option_id }).exec()
    } catch (error) {
        return _throw500(res, error)
    }

    if (!option) {
        return _throw400(res, "Question not found!")
    }

    if (!question._id === option.question_id) {
        return _throw400(res, "Qption does not belong to given question!")
    }
    if (req.body.is_correct == true) {
        let options = null
        try {
            options = await QuizQuestionOptions.findOne({ "question_id": req.body["question_id"], 'quiz_id': req.body["quiz_id"], 'is_correct': true }).exec()
        } catch (error) {
            return _throw500(res, error)
        }

        if (options) {
            return _throw400(res, "multiple ans can't be true in mcq question")
        }
    }
    if (req.files && req.files["option_image"]) {
        let upload = await UPLOAD_IMAGE(req.files.option_image[0])
        req.body.option_image = upload.secure_url
    }

    let updated_option = null
    try {
        updated_option = await QuizQuestionOptions.findOneAndUpdate({ "_id": req.query.option_id }, req.body, { new: true }).exec()
    } catch (error) {
        return _throw500(res, error)
    }

    return res.status(200).json(updated_option)
}

exports.DELETE_QUIZ_QUESTION_OPTION_ADMIN = async (req, res) => {
    if (!req.query.quiz_id) {
        return _throw400(res, "Quiz ID is required!")
    }

    let quiz = null
    try {
        quiz = await Quiz.findOne({ "_id": req.query.quiz_id }).exec()
    } catch (error) {
        return _throw500(res, error)
    }

    if (!quiz) {
        return _throw400(res, "Quiz not found!")
    }

    if (!req.query.question_id) {
        return _throw400(res, "Question ID is required!")
    }

    let question = null
    try {
        question = await QuizQuestions.findOne({ "_id": req.query.question_id }).exec()
    } catch (error) {
        return _throw500(res, error)
    }

    if (!question) {
        return _throw400(res, "Question not found!")
    }

    if (!question.quiz_id === quiz._id) {
        return _throw400(res, "Question does not belong to given quiz!")
    }

    if (!req.query.question_id) {
        return _throw400(res, "Question ID is required!")
    }

    let option = null
    try {
        option = await QuizQuestionOptions.findOne({ "_id": req.query.option_id }).exec()
    } catch (error) {
        return _throw500(res, error)
    }

    if (!option) {
        return _throw400(res, "Options not found!")
    }

    if (!question._id === option.question_id) {
        return _throw400(res, "Qption does not belong to given question!")
    }

    if (question.answers) {
        let newanswers = question.answers

        const index = newanswers.indexOf(req.query.option_id)
        if (index > -1) {
            newanswers.splice(index, 1)
        }

        let data = {
            answers: newanswers
        }

        let updated_question = null
        try {
            updated_question = await QuizQuestions.findOneAndUpdate({ "_id": req.query.question_id }, data, { new: true }).exec()
        } catch (error) {
            return _throw500(res, error)
        }
    }

    let delete_option = null
    try {
        delete_option = await QuizQuestionOptions.findOneAndDelete({ "_id": req.query.option_id }).exec()
    } catch (error) {
        return _throw500(res, error)
    }

    return res.status(200).json(delete_option)
}

exports.GET_SINGLE_QUIZ_QUESTION_OPTION_ADMIN = async (req, res) => {
    if (!req.query.quiz_id) {
        return _throw400(res, "Quiz ID is required!")
    }

    let quiz = null
    try {
        quiz = await Quiz.findOne({ "_id": req.query.quiz_id }).exec()
    } catch (error) {
        return _throw500(res, error)
    }

    if (!quiz) {
        return _throw400(res, "Quiz not found!")
    }

    if (!req.query.question_id) {
        return _throw400(res, "Question ID is required!")
    }

    let question = null
    try {
        question = await QuizQuestions.findOne({ "_id": req.query.question_id }).exec()
    } catch (error) {
        return _throw500(res, error)
    }

    if (!question) {
        return _throw400(res, "Question not found!")
    }

    if (!question.quiz_id === quiz._id) {
        return _throw400(res, "Question does not belong to given quiz!")
    }

    if (!req.query.question_id) {
        return _throw400(res, "Question ID is required!")
    }

    let option = null
    try {
        option = await QuizQuestionOptions.findOne({ "_id": req.query.option_id }).exec()
    } catch (error) {
        return _throw500(res, error)
    }

    if (!option) {
        return _throw400(res, "Options not found!")
    }

    if (!question._id === option.question_id) {
        return _throw400(res, "Qption does not belong to given question!")
    }

    return res.status(200).send(option)
}

exports.GET_QUIZ_QUESTION_OPTION_LIST_ADMIN = async (req, res) => {
    if (!req.query.quiz_id) {
        return _throw400(res, "Quiz ID is required!")
    }
    if (!req.query.question_id) {
        return _throw400(res, "Question ID is required!")
    }
    let quizes = null
    try {
        quizes = await QuizQuestionOptions.aggregate([
            {
                $match: {
                    quiz_id: new mongoose.Types.ObjectId(req.query.quiz_id)
                }
            },
            {
                $match: {
                    question_id: new mongoose.Types.ObjectId(req.query.question_id)
                }
            },
            {
                $sort: { createdAt: 1 }
            }
        ]).exec()
    } catch (error) {
        return _throw500(res, error)
    }
    if (!quizes.length) {
        return _throw400(res, 'question not found')
    }
    return res.status(200).json(quizes)

}

exports.ADD_BULK_QUIZ_QUESTION_OPTIONS_ADMIN = async (req, res) => {
    const options = req.body.options;

    if (!Array.isArray(options)) {
        return _throw400(res, "Options should be provided as an array!");
    }

    const optionPromises = options.map(async (option) => {
        const { quiz_id, question_id, option_image, ...otherFields } = option;

        if (!quiz_id) {
            return _throw400("Quiz ID is required!");
        }

        if (!question_id) {
            return _throw400("Question ID is required!");
        }

        let quiz = null;
        try {
            quiz = await Quiz.findOne({ _id: quiz_id }).exec();
        } catch (error) {
            return _throw400Err(res, error);
        }

        if (!quiz) {
            return _throw400("Quiz not found!");
        }

        let question = null;
        try {
            question = await QuizQuestions.findOne({ _id: question_id }).exec();
        } catch (error) {
            return _throw400Err(res, error);
        }

        if (!question) {
            return _throw400("Question not found!");
        }

        if (question.quiz_id !== quiz._id) {
            return _throw400("Question does not belong to the given quiz!");
        }
        let options_list = null
        try {
            options_list = await QuizQuestionOptions.find({ "question_id": req.body["question_id"], 'quiz_id': req.body["quiz_id"] }).exec()
        } catch (error) {
            return _throw500(res, error)
        }

        if (options_list.length) {
            options_list.forEach(async (x) => {
                await QuizQuestionOptions.findOneAndDelete({ "_id": x._id })
            })
        }
        if (req.files && req.files["option_image"]) {
            let upload = await UPLOAD_IMAGE(req.files.option_image[0]);
            option_image = upload.secure_url;
        }

        const question_option = new QuizQuestionOptions({
            ...otherFields,
            quiz_id,
            question_id,
            option_image,
        });

        try {
            await question_option.validate();
            const saved_option = await question_option.save();

            if (saved_option.is_correct) {
                await QuizQuestions.findOneAndUpdate(
                    { _id: question_id },
                    { $push: { answers: saved_option._id } },
                    { new: true }
                ).exec();
            }

            return saved_option;
        } catch (err) {
            return _throw400(res, err);
        }
    });

    try {
        const savedOptions = await Promise.allSettled(optionPromises);
        const successfulOptions = savedOptions
            .filter((result) => result.status === "fulfilled")
            .map((result) => result.value);

        return res.status(200).json(successfulOptions);
    } catch (error) {
        return _throw400(res, error.message);
    }
};
/**
 * These api are used to add,delete,edit and retrive response of quiz
 * @param {*} req 
 * @param {*} res 
 * @returns {}
 */

exports.SETUP_QUIZ_STUDENT = async (req, res) => {
    if (!req.query.quiz_id) {
        return _throw400(res, "Quiz ID is required!")
    }
    if (!req?.body?.user?.user_id) {
        return _throw400(res, "User ID is required!")
    }
    let quiz = null
    try {
        quiz = await Quiz.findOne({ "_id": req.query.quiz_id }).exec()
    } catch (error) {
        return _throw500(res, error)
    }

    if (!quiz) {
        return _throw400(res, "Quiz not found!")
    }
    if (quiz.published == false) {
        return _throw400(res, "Quiz is not Published yet!")
    }
    let quiz_submission = null
    try {
        quiz_submission = await QuizSubmissions.find({ "quiz_id": req.query.quiz_id, "user.user_id": req.body.user.user_id, "is_submitted": true })
    } catch (error) {
        return _throw500(res, error)
    }

    if (quiz_submission && quiz_submission.length >= quiz.max_attempts) {
        return _throw400(res, "Maximum attempts reached!")
    }

    let currentdate = moment(Date.now())
    let deadline = moment(quiz.deadline)
    let starttime = moment(quiz.start_time)
    if (currentdate > deadline) {
        return _throw400(res, "You Can't Appear The Quiz after deadline!!")
    }

    if (starttime >= currentdate) {
        return _throw400(res, "You Can't Appear The Quiz before the start!!")
    }
    let quiz_submission_data = null
    try {
        quiz_submission_data = await QuizSubmissions.findOne({ "quiz_id": req.query.quiz_id, "user.user_id": req.body.user.user_id, "is_submitted": false })
    } catch (error) {
        return _throw500(res, error)
    }
    if (quiz_submission_data) {
        try {
            let submission_details = await QuizSubmissions.aggregate([
                {
                    $match: {
                        "_id": quiz_submission_data._id
                    }
                },
                {
                    $lookup: {
                        from: "quiz-response",
                        localField: "_id",
                        foreignField: "submission_id",
                        as: "responses"
                    }
                }
            ])
            return res.status(200).send(submission_details)
        } catch (error) {
            return _throw500(res, error)
        }
    } else {
        let data = {
            "user": req.body.user,
            "quiz_id": req.query.quiz_id,
            "is_submitted": false,
            "start_time": new Date(),
            "submitted_time": null
        }

        let submission = new QuizSubmissions(data)
        submission.validate().then(async (_noerr) => {
            submission.save().then(saved_submission => {
                return res.status(200).json(saved_submission)
            }).catch(err => {
                return _throw400(res, err)
            })
        }).catch(err => {
            return _throw400(res, err)
        })
    }
}

exports.GET_SINGLE_QUIZ_PUBLIC = async (req, res) => {
    if (!req.query.quiz_id) {
        return _throw400(res, "Quiz ID is required!")
    }

    let quiz = null
    let query = {}
    query["_id"] = new mongoose.Types.ObjectId(req.query.quiz_id)

    try {
        quiz = await Quiz.aggregate([
            {
                $match: query
            },
            {
                $lookup: {
                    from: "quiz-page",
                    let: {
                        "quiz_id": "$_id"
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ["$quiz_id", "$$quiz_id"]
                                }
                            }
                        },
                        {
                            $lookup: {
                                from: "quiz-questions",
                                let: {
                                    "page_id": "$_id"
                                },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: {
                                                $eq: ["$quiz_page_id", "$$page_id"]
                                            }
                                        }
                                    },
                                    {
                                        $project: {
                                            answers: 0,
                                            answer_explanation: 0,
                                            createdAt: 0,
                                            updatedAt: 0
                                        }
                                    },
                                    {
                                        $lookup: {
                                            from: "quiz-question-options",
                                            let: {
                                                "question_id": "$_id"
                                            },
                                            pipeline: [
                                                {
                                                    $match: {
                                                        $expr: {
                                                            $eq: ["$question_id", "$$question_id"]
                                                        }
                                                    }
                                                },
                                                {
                                                    $project: {
                                                        is_correct: 0,
                                                        marks: 0,
                                                        createdAt: 0,
                                                        updatedAt: 0
                                                    }
                                                }
                                            ],
                                            as: "options"
                                        }
                                    },
                                ],
                                as: "questions"
                            }
                        }
                    ],
                    as: "pages"
                }
            }
        ]).exec()
    } catch (error) {
        return _throw500(res, error)
    }
    if (!quiz.length) {
        return _throw404(res, 'no such quiz found')
    }
    if (quiz[0].published == false) {
        return _throw404(res, 'quiz is not published yet')
    }
    return res.status(200).json(quiz)
}

exports.ADD_QUIZ_STUDENT_RESPONSE = async (req, res) => {
    if (!req.query.quiz_submission_id) {
        return _throw400(res, "Quiz submission ID is required!")
    }

    let quiz_submission = null
    try {
        quiz_submission = await QuizSubmissions.findOne({ "_id": req.query.quiz_submission_id }).exec()
    } catch (error) {
        return _throw500(res, error)
    }

    if (!quiz_submission) {
        return _throw400(res, "Setup quiz first")
    }

    if (quiz_submission.is_submitted) {
        return _throw400(res, "Already Submitted!")
    }

    let quiz = null
    try {
        quiz = await Quiz.findOne({ "_id": quiz_submission.quiz_id }).exec()
    } catch (error) {
        return _throw500(res, error)
    }

    let quiz_question = null
    try {
        quiz_question = await QuizQuestions.findOne({ "quiz_id": quiz_submission.quiz_id, "_id": req.body.question }).exec()
    } catch (error) {
        return _throw500(res, error)
    }

    if (!quiz_question) {
        return _throw400(res, "Invalid question id!")
    }

    // let increment_marks = quiz_submission.marks_scored

    let currentdate = moment(Date.now())
    let deadline = moment(quiz.deadline)

    if (currentdate > deadline) {
        return _throw400(res, "response after deadline is not allowed!")
    }
    let data = null
    if (quiz_question.question_type == "Multi") {
        data = {
            quiz_id: quiz_submission.quiz_id,
            submission_id: req.query.quiz_submission_id,
            question: req.body.question,
            answer: req.body.answer
        }
    } else {
        data = {
            quiz_id: quiz_submission.quiz_id,
            submission_id: req.query.quiz_submission_id,
            question: req.body.question,
            descriptive: req.body.answer
        }
    }
    let quiz_response = null;
    try {
        quiz_response = await QuizResponse.findOne({
            quiz_id: quiz_submission.quiz_id,
            submission_id: req.query.quiz_submission_id,
            question: req.body.question
        })
    } catch (error) {
        return _throw400Err(res, error)
    }
    if (quiz_response) {
        await QuizResponse.findByIdAndDelete(quiz_response._id)
    }
    let mark_response = new QuizResponse(data)
    await mark_response.validate()
    await mark_response.save()
    // let updated_submission = null
    // let quiz_options = null
    // if (quiz_question.question_type == "Multi") {
    // try {
    //     quiz_options = await QuizQuestionOptions.findOne({ "quiz_id": quiz_submission.quiz_id, "question_id": req.body.question, "_id": req.body.answer }).exec()
    // } catch (error) {
    //     return _throw500(res, error)
    // }

    // if (!quiz_options) {
    //     return _throw400(res, "Invalid option id!")
    // }
    // if (quiz_question.answers[0]["option_text"].includes(req.body.answer)) {
    //     increment_marks += quiz_question.answers[0]["marks"]
    // } else {
    //     quiz_question.options.forEach((x) => {
    //         if (x.option_text == req.body.answer) {
    //             increment_marks += x.marks
    //         }
    //     })
    // }
    // try {
    //     updated_submission = await QuizSubmissions.findOneAndUpdate(
    //         { "_id": req.query.quiz_submission_id },
    //         { $push: { responses: { "question": req.body.question, "answer": req.body.answer } }, "marks_scored": increment_marks },
    //         { new: true })
    //         .exec()
    // } catch (error) {
    //     return _throw500(res, error)
    // }
    // } else {
    //     try {
    //         updated_submission = await QuizSubmissions.findOneAndUpdate(
    //             { "_id": req.query.quiz_submission_id },
    //             { $push: { responses: { "question": req.body.question, "descriptive": req.body.answer } } },
    //             { new: true })
    //             .exec()
    //     } catch (error) {
    //         return _throw500(res, error)
    //     }
    // }
    return res.status(200).json(mark_response)
}

exports.DELETE_SINGLE_QUIZ_RESPONSE = async (req, res) => {
    if (!req.query.quiz_submission_id) {
        return _throw400(res, 'submission id is required')
    }
    if (!req.query.quiz_id) {
        return _throw400(res, "Quiz ID is required!")
    }
    if (!req.query.question_id) {
        return _throw400(res, 'question id is required')
    }
    let quiz_response = null;
    try {
        quiz_response = await QuizResponse.findOne({
            quiz_id: req.query.quiz_id,
            submission_id: req.query.quiz_submission_id,
            question: req.query.question_id
        })
    } catch (error) {
        return _throw400Err(res, error)
    }
    if (!quiz_response) {
        return _throw404(res, 'no response found')
    }
    await QuizResponse.findByIdAndDelete(quiz_response._id)
    return res.status(200).send("response deleted successful")
}

exports.GET_QUIZ_STUDENT_RESPONSE = async (req, res) => {
    if (!req.query.quiz_submission_id) {
        return _throw400(res, "Quiz submission id is required!")
    }
    let quiz_response = null;
    try {
        quiz_response = await QuizResponse.aggregate([
            {
                $match: {
                    "submission_id": new mongoose.Types.ObjectId(req.query.quiz_submission_id)
                }
            }
        ])
    } catch (error) {
        return _throw400Err(res, error)
    }
    return res.status(200).send(quiz_response)
}

exports.SUBMIT_QUIZ_STUDENT_RESPONSE = async (req, res) => {
    if (!req.query.quiz_submission_id) {
        return _throw400(res, "Quiz ID is required!")
    }

    let quiz_submission = null
    try {
        quiz_submission = await QuizSubmissions.findOne(
            { "_id": req.query.quiz_submission_id },
            { "createdAt": 0, "updatedAt": 0 }
        ).exec()
    } catch (error) {
        return _throw500(res, error)
    }

    if (!quiz_submission) {
        return _throw400(res, "Setup quiz first")
    }

    let quiz = null
    try {
        quiz = await Quiz.findOne({ "_id": quiz_submission.quiz_id }).exec()
    } catch (error) {
        return _throw500(res, error)
    }

    if (quiz_submission.is_submitted) {
        return _throw400(res, "Already Submitted!")
    }
    let currentdate = moment(Date.now())
    let deadline = moment(quiz.deadline)

    if (currentdate > deadline) {
        return _throw400(res, "Submission after deadline is not allowed!")
    }

    let update_data = {
        "is_submitted": true,
        "submitted_time": new Date()
    }

    let updated_quiz_submission = null
    try {
        updated_quiz_submission = await QuizSubmissions.findOneAndUpdate({ "_id": req.query.quiz_submission_id }, update_data, { new: true }).exec()
    } catch (error) {
        return _throw500(res, error)
    }
    let obj = null
    if (!quiz.show_result) {
        obj = {
            $project: {
                "marks_scored": 0
            }
        }
    } else {
        obj = {
            $sort: {
                createdAt: -1
            }
        }
    }
    let send_quiz_submissions = null
    try {
        send_quiz_submissions = await QuizSubmissions.aggregate([
            {
                $match: {
                    "_id": new mongoose.Types.ObjectId(req.query.quiz_submission_id)
                }
            },
            {
                $lookup: {
                    from: "quiz-response",
                    localField: "_id",
                    foreignField: "submission_id",
                    as: "responses"
                }
            },
            {
                $lookup: {
                    from: "quiz",
                    let: {
                        "quiz_id": "$quiz_id"
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ["$_id", "$$quiz_id"]
                                }
                            }
                        },
                        {
                            $lookup: {
                                from: "quiz-page",
                                let: {
                                    "quiz_id": "$_id"
                                },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: {
                                                $eq: ["$quiz_id", "$$quiz_id"]
                                            }
                                        }
                                    },
                                    {
                                        $lookup: {
                                            from: "quiz-questions",
                                            let: {
                                                "page_id": "$_id"
                                            },
                                            pipeline: [
                                                {
                                                    $match: {
                                                        $expr: {
                                                            $eq: ["$quiz_page_id", "$$page_id"]
                                                        }
                                                    }
                                                },
                                                {
                                                    $lookup: {
                                                        from: "quiz-question-options",
                                                        let: {
                                                            "question_id": "$_id"
                                                        },
                                                        pipeline: [
                                                            {
                                                                $match: {
                                                                    $expr: {
                                                                        $eq: ["$question_id", "$$question_id"]
                                                                    }
                                                                }
                                                            },
                                                            {
                                                                $project: {
                                                                    createdAt: 0,
                                                                    updatedAt: 0
                                                                }
                                                            }
                                                        ],
                                                        as: "options"
                                                    }
                                                },
                                            ],
                                            as: "questions"
                                        }
                                    }
                                ],
                                as: "pages"
                            }
                        }
                    ],
                    as: "quiz"
                }
            },
            {
                $addFields: {
                    timeTaken: {
                        $divide: [
                            { $subtract: ["$submitted_time", "$start_time"] },
                            1000 * 60
                        ]
                    }
                }
            },
            {
                $unwind: {
                    path: "$responses",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    from: "quiz-question-options",
                    localField: "responses.answer",
                    foreignField: "_id",
                    as: "option"
                }
            },
            {
                $group: {
                    _id: "$_id",
                    quiz_id: { $first: "$quiz_id" },
                    objective_mark_scored: {
                        $sum: {
                            $cond: [
                                { $eq: [{ $arrayElemAt: ["$option.is_correct", 0] }, true] },
                                { $max: [0, { $arrayElemAt: ["$option.marks", 0] }] },
                                { $min: [0, { $arrayElemAt: ["$option.marks", 0] }] }
                            ]
                        }
                    },
                    responses: { $push: "$responses" },
                    start_time: { $first: "$start_time" },
                    submitted_time: { $first: "$submitted_time" },
                    createdAt: { $first: "$createdAt" },
                    updatedAt: { $first: "$updatedAt" },
                    timeTaken: { $first: "$timeTaken" },
                    quiz: { $first: "$quiz" },
                    user: { $first: "$user" }
                }
            },
            obj
        ]).exec()
    } catch (error) {
        return _throw500(res, error)
    }
    let total_question = 0
    for (let i = 0; i < send_quiz_submissions[0]["quiz"][0]["pages"].length; i++) {
        total_question += send_quiz_submissions[0]["quiz"][0]["pages"][i]["questions"].length
    }
    let result = {
        number_of_question_attemped: send_quiz_submissions[0]["responses"].length,
        max_marks: send_quiz_submissions[0]["quiz"][0]["max_marks"],
        total_question: total_question,
        subjective_mark_scored:0
    }
    await QuizSubmissions.findOneAndUpdate({ "_id": req.query.quiz_submission_id }, { result_overview: result }, { new: true }).exec()
    return res.status(200).json({ message: "submission successful", data: result })

}

exports.GET_SUBMISSION_LIST_ADMIN = async (req, res) => {
    let pipeline = []
    let page = 1
    if (req.query.page) {
        page = parseInt(req.query.page)
    }

    let page_size = 10
    if (req.query.page_size) {
        page_size = parseInt(req.query.page_size)
    }

    if (req.query.quiz_id && req.query.quiz_id != "undefined") {
        pipeline.push({ $match: { quiz_id: new mongoose.Types.ObjectId(req.query.quiz_id) } })
    }
    if (req.query.user_id && req.query.user_id != "undefined") {
        pipeline.push({ $match: { "user.user_id": new mongoose.Types.ObjectId(req.query.user_id) } })
    }
    if (req.query.submitted) {
        req.query.submitted == "true" ? req.query.submitted = true : req.query.submitted = false
        pipeline.push({ $match: { is_submitted: req.query.submitted } })
    }
    if (req.query.sort == "mark") {
        pipeline.push({ $sort: { 'marks_scored': -1 } })
    }
    pipeline.push({
        $sort: { submitted_time: -1 }
    })
    pipeline.push({
        $lookup: {
            from: "quiz",
            localField: "quiz_id",
            foreignField: "_id",
            as: "quiz"
        }
    })
    if (req.query.search) {
        pipeline.push({
            $match: {
                "quiz.title": { $regex: ".*" + req.query.search + ".*", $options: "i" }
            }
        });
    }
    pipeline.push({
        $addFields: {
            timeTaken: {
                $divide: [
                    { $subtract: ["$submitted_time", "$start_time"] },
                    1000 * 60
                ]
            }
        }
    });
    if (req.query.sort == "time") {
        pipeline.push({
            $sort: { 'timeTaken': -1 }
        });
    } else if (req.query.sort == "title") {
        pipeline.push({
            $sort: { "quiz.title": -1 }
        });
    }
    pipeline.push({
        $lookup: {
            from: "quiz-response",
            localField: "_id",
            foreignField: "submission_id",
            as: "responses"
        }
    })
    pipeline.push({
        $unwind: {
            path: "$responses",
            preserveNullAndEmptyArrays: true
        }
    });

    pipeline.push({
        $lookup: {
            from: "quiz-question-options",
            localField: "responses.answer",
            foreignField: "_id",
            as: "option"
        }
    });

    pipeline.push(
        {
            $group: {
                _id: "$_id",
                quiz_id: { $first: "$quiz_id" },
                objective_mark_scored: {
                    $sum: {
                        $cond: [
                            { $eq: [{ $arrayElemAt: ["$option.is_correct", 0] }, true] },
                            { $max: [0, { $arrayElemAt: ["$option.marks", 0] }] },
                            { $min: [0, { $arrayElemAt: ["$option.marks", 0] }] }
                        ]
                    }
                },
                responses: { $push: "$responses" },
                start_time: { $first: "$start_time" },
                submitted_time: { $first: "$submitted_time" },
                createdAt: { $first: "$createdAt" },
                updatedAt: { $first: "$updatedAt" },
                timeTaken: { $first: "$timeTaken" },
                quiz: { $first: "$quiz" },
                user: { $first: "$user" },
                result_overview: { $first: "$result_overview" }
            }
        },
        {
            $addFields: {
                total_marks: {
                    $add: ["$objective_mark_scored", "$result_overview.subjective_mark_scored"]
                }
            }
        }
    )

    pipeline.push({
        $project: {
            'responses': 0,
            'createdAt': 0,
            'updatedAt': 0,
            '__v': 0,
            'is_submitted': 0,
            'option': 0,
            'quiz.createdAt': 0,
            'quiz.updatedAt': 0,
            'quiz.pages': 0,
            'quiz.start_time': 0,
            'quiz.deadline': 0,
            'quiz.show_result': 0,
            'quiz.published': 0,
            'quiz.__v': 0,
            'quiz.quiz_description': 0,
        }
    })
    pipeline.push({
        $facet: {
            "metadata": [{ "$count": "total_records" }],
            "records": [{ "$skip": (page - 1) * page_size }, { "$limit": page_size }],
        }
    })

    let submission_list = null;
    try {
        submission_list = await QuizSubmissions.aggregate(pipeline)
    } catch (err) {
        return _throw400Err(res, err)
    }
    if (!submission_list.length) {
        return _throw404(res, 'no submission found')
    }
    submission_list[0].records.forEach((record) => {
        const { total_marks, quiz } = record;
        const max_marks = quiz[0].max_marks;
        const percentage = (total_marks / max_marks) * 100;
        record.percentage = percentage;
    });
    if (req.query.sort == "percentage") {
        submission_list[0].records.sort((a, b) => b.percentage - a.percentage);
    }

    return res.status(200).send(submission_list)
}

// exports.GET_SUBMISSION_LIST_ADMIN = async (req, res) => {
//     let pipeline = [
//         {
//             $sort: { 'data.createdAt': -1 }
//         }
//     ]
//     let page = 1
//     if (req.query.page) {
//         page = parseInt(req.query.page)
//     }

//     let page_size = 10
//     if (req.query.page_size) {
//         page_size = parseInt(req.query.page_size)
//     }

//     if (req.query.quiz_id && req.query.quiz_id != "undefined") {
//         pipeline.push({ $match: { 'data.quiz_id': new mongoose.Types.ObjectId(req.query.quiz_id) } })
//     }
//     if (req.query.user_id && req.query.user_id != "undefined") {
//         pipeline.push({ $match: { 'data.user.user_id': new mongoose.Types.ObjectId(req.query.user_id) } })
//     }
//     if (req.query.sort == "mark") {
//         pipeline.push({ $sort: { 'data.marks_scored': -1 } })
//     }

//     if (req.query.search) {
//         pipeline.push({
//             $match: {
//                 "data.quiz.title": { $regex: ".*" + req.query.search + ".*", $options: "i" }
//             }
//         });
//     }
//     if (req.query.sort == "time") {
//         pipeline.push({
//             $sort: { 'data.timeTaken': -1 }
//         });
//     } else if (req.query.sort == "title") {
//         pipeline.push({
//             $sort: { "data.quiz.title": -1 }
//         });
//     }
//     pipeline.push({
//         $project: {
//             'data.responses': 0,
//             'data.createdAt': 0,
//             'data.updatedAt': 0,
//             'data.quiz.createdAt': 0,
//             'data.quiz.updatedAt': 0,
//             'data.quiz.pages': 0,
//             'data.quiz.start_time': 0,
//             'data.quiz.deadline': 0,
//             'data.quiz.show_result': 0,
//             'data.quiz.published': 0,
//             'data.quiz.__v': 0,
//             'data.quiz.quiz_description': 0,
//             '__v': 0
//         }
//     })
//     pipeline.push({
//         $facet: {
//             "metadata": [{ "$count": "total_records" }],
//             "records": [{ "$skip": (page - 1) * page_size }, { "$limit": page_size }],
//         }
//     })

//     let submission_list = null;
//     try {
//         submission_list = await QuizClone.aggregate(pipeline)
//     } catch (err) {
//         return _throw400Err(res, err)
//     }
//     if (!submission_list.length) {
//         return _throw404(res, 'no submission found')
//     }
//     submission_list[0].records.forEach((record) => {
//         const { marks_scored, quiz } = record.data[0];
//         const max_marks = quiz[0].max_marks;
//         const percentage = (marks_scored / max_marks) * 100;
//         record.data[0].percentage = percentage;
//     });
//     if (req.query.sort == "percentage") {
//         submission_list[0].records.sort((a, b) => b.data[0].percentage - a.data[0].percentage);
//     }
//     return res.status(200).send(submission_list)
// }

exports.VIEW_QUIZ_RESULTS_STUDENT = async (req, res) => {
    let pipeline = [
        {
            $match:{
                is_submitted:true
            }
        },
        {
            $sort: { submitted_time: -1 }
        }
    ]

    if (req.query.quiz_id && req.query.quiz_id != "undefined") {
        pipeline.push({ $match: { quiz_id: new mongoose.Types.ObjectId(req.query.quiz_id) } })
    }
    if (req.query.user_id && req.query.user_id != "undefined") {
        pipeline.push({ $match: { "user.user_id": new mongoose.Types.ObjectId(req.query.user_id) } })
    }
    if (req.query.quiz_submission_id) {
        pipeline.push({ $match: { "_id": new mongoose.Types.ObjectId(req.query.quiz_submission_id) } })
    }

    pipeline.push({
        $lookup: {
            from: "quiz",
            let: {
                quiz_id: "$quiz_id"
            },
            pipeline: [
                {
                    $match: {
                        $expr: {
                            $eq: ["$_id", "$$quiz_id"]
                        }
                    }
                },
                {
                    $lookup: {
                        from: "quiz-page",
                        let: {
                            "quiz_id": "$_id"
                        },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: ["$quiz_id", "$$quiz_id"]
                                    }
                                }
                            },
                            {
                                $lookup: {
                                    from: "quiz-questions",
                                    let: {
                                        "page_id": "$_id"
                                    },
                                    pipeline: [
                                        {
                                            $match: {
                                                $expr: {
                                                    $eq: ["$quiz_page_id", "$$page_id"]
                                                }
                                            }
                                        },
                                        {
                                            $project: {
                                                answers: 0,
                                                createdAt: 0,
                                                updatedAt: 0
                                            }
                                        },
                                        {
                                            $lookup: {
                                                from: "quiz-question-options",
                                                let: {
                                                    "question_id": "$_id"
                                                },
                                                pipeline: [
                                                    {
                                                        $match: {
                                                            $expr: {
                                                                $eq: ["$question_id", "$$question_id"]
                                                            }
                                                        }
                                                    },
                                                    {
                                                        $project: {
                                                            marks: 0,
                                                            createdAt: 0,
                                                            updatedAt: 0
                                                        }
                                                    }
                                                ],
                                                as: "options"
                                            }
                                        },
                                    ],
                                    as: "questions"
                                }
                            }
                        ],
                        as: "pages"
                    }
                }
            ],
            // localField: "quiz_id",
            // foreignField: "_id",
            as: "quiz"
        }
    })
    pipeline.push({
        $addFields: {
            timeTaken: {
                $divide: [
                    { $subtract: ["$submitted_time", "$start_time"] },
                    1000 * 60
                ]
            }
        }
    });
    pipeline.push({
        $lookup: {
            from: "quiz-response",
            localField: "_id",
            foreignField: "submission_id",
            as: "responses"
        }
    })
    pipeline.push({
        $unwind: {
            path: "$responses",
            preserveNullAndEmptyArrays: true
        }
    });

    pipeline.push({
        $lookup: {
            from: "quiz-question-options",
            localField: "responses.answer",
            foreignField: "_id",
            as: "option"
        }
    });

    pipeline.push(
        {
            $group: {
                _id: "$_id",
                quiz_id: { $first: "$quiz_id" },
                objective_mark_scored: {
                    $sum: {
                        $cond: [
                            { $eq: [{ $arrayElemAt: ["$option.is_correct", 0] }, true] },
                            { $max: [0, { $arrayElemAt: ["$option.marks", 0] }] },
                            { $min: [0, { $arrayElemAt: ["$option.marks", 0] }] }
                        ]
                    }
                },
                correct_question_count: {
                    $sum: {
                        $cond: [
                            { $and: [
                                { $eq: [{ $arrayElemAt: ["$option.is_correct", 0] }, true] },
                                { $ne: ["$responses.answer", null] }
                            ] },
                            1,
                            0
                        ]
                    }
                },
                responses: { $push: "$responses" },
                start_time: { $first: "$start_time" },
                submitted_time: { $first: "$submitted_time" },
                createdAt: { $first: "$createdAt" },
                updatedAt: { $first: "$updatedAt" },
                timeTaken: { $first: "$timeTaken" },
                quiz: { $first: "$quiz" },
                user: { $first: "$user" },
                result_overview: { $first: "$result_overview" },
                subjective_responses: { $first: "$subjective_responses" }
            }
        },
        {
            $addFields: {
                total_marks: {
                    $add: ["$objective_mark_scored", "$result_overview.subjective_mark_scored"]
                }
            }
        }
    )
    if (req.query.user_id && req.query.user_id != "undefined") {
        pipeline.push({
            $project:{
                "quiz_id":1,
                "quiz.title":1
            }
        })
    }
    let quiz_result = null;
    try {
        quiz_result = await QuizSubmissions.aggregate(pipeline)
    } catch (error) {
        return _throw400Err(res, error)
    }
    if(!quiz_result.length){
        return _throw400(res,'no quiz attemped')
    }
    return res.status(200).send(quiz_result)
}

exports.DELETE_SINGLE_RESULT = async (req, res) => {
    if (!req.query.quiz_clone_id) {
        return _throw400(res, 'quiz clone id is required')
    }
    let result_details = null;
    try {
        result_details = await QuizClone.findById(req.query.quiz_clone_id)
    } catch (error) {
        return _throw400Err(res, error)
    }
    if (!result_details) {
        return _throw400(res, 'no such result found')
    }
    let delete_result = null;
    try {
        delete_result = await QuizClone.findByIdAndDelete(req.query.quiz_clone_id)
    } catch (error) {
        return _throw400Err(res, error)
    }
    if (!delete_result) {
        return _throw400(res, 'deletion failed')
    }
    return res.status(200).send({ message: "delete successful", data: delete_result })
}

exports.DELETE_BULK_RESULT = async (req, res) => {
    let id_list = req.body.quiz_clone_id
    if (!id_list.length) {
        return _throw400(res, 'quiz clone id is required')
    }
    for (let i = 0; i < id_list.length; i++) {
        let result_details = null;
        try {
            result_details = await QuizClone.findById(id_list[i])
        } catch (error) {
            return _throw400Err(res, error)
        }
        if (!result_details) {
            return _throw400(res, 'no such result found')
        }
        let delete_result = null;
        try {
            delete_result = await QuizClone.findByIdAndDelete(id_list[i])
        } catch (error) {
            return _throw400Err(res, error)
        }
    }
    return res.status(200).send('quiz deleted successful')
}

exports.DELETE_SINGLE_SUBMISSION = async (req, res) => {
    if (!req.query.quiz_submission_id) {
        return _throw400(res, 'quiz submission id is required')
    }
    let result_details = null;
    try {
        result_details = await QuizSubmissions.findById(req.query.quiz_submission_id)
    } catch (error) {
        return _throw400Err(res, error)
    }
    if (!result_details) {
        return _throw400(res, 'no such result found')
    }
    let delete_result = null;
    try {
        delete_result = await QuizSubmissions.findByIdAndDelete(req.query.quiz_submission_id)
    } catch (error) {
        return _throw400Err(res, error)
    }
    if (!delete_result) {
        return _throw400(res, 'deletion failed')
    }
    return res.status(200).send({ message: "delete successful", data: delete_result })
}

exports.DELETE_BULK__SUBMISSION = async (req, res) => {
    let id_list = req.body.quiz_submission_id
    if (!id_list.length) {
        return _throw400(res, 'quiz submission id is required')
    }
    for (let i = 0; i < id_list.length; i++) {
        let result_details = null;
        try {
            result_details = await QuizSubmissions.findById(id_list[i])
        } catch (error) {
            return _throw400Err(res, error)
        }
        if (!result_details) {
            return _throw400(res, 'no such result found')
        }
        let delete_result = null;
        try {
            delete_result = await QuizSubmissions.findByIdAndDelete(id_list[i])
        } catch (error) {
            return _throw400Err(res, error)
        }
    }
    return res.status(200).send('quiz deleted successful')
}
/**
 * image upload api's
 */

exports.ADD_QUIZ_IMAGE_ADMIN = async (req, res) => {

    if (req.files && req.files["question_image"]) {
        let upload = await UPLOAD_IMAGE(req.files.question_image[0])
        req.body.question_image = upload.secure_url
    } else {
        return _throw400(res, 'image not found')
    }

    let question_image = new QuizImage(req.body)
    question_image.validate().then(async (_noerr) => {

        question_image.save().then(saved_image => {
            return res.status(200).json({ message: "image added successful", data: saved_image })
        }).catch(err => {
            return _throw400(res, err)
        })

    }).catch(err => {
        return _throw400(res, err)
    })
}

exports.ADD_MULTIPLE_QUIZ_IMAGE_ADMIN = async (req, res) => {
    let upload = null;
    try {
        if (req.files && req.files["question_image"]) {
            upload = await UPLOAD_MULTIPLE_IMAGE(req.files.question_image)
        } else {
            return _throw400(res, 'image not found')
        }
        for (let i = 0; i < upload.length; i++) {
            req.body.question_image = upload[i].secure_url
            let question_image = new QuizImage(req.body)
            await question_image.validate()
            await question_image.save()
        }
        return res.status(200).json({ message: "image added successful" })

    } catch (error) {
        return _throw400Err(res, error)
    }
}

exports.GET_IMAGE_LIST_ADMIN = async (req, res) => {
    let image_list = null;
    try {
        image_list = await QuizImage.find()
    } catch (error) {
        return _throw400Err(res, error)
    }
    if (!image_list.length) {
        return _throw400(res, 'no image found')
    }
    return res.status(200).send(image_list)
}

exports.GET_SPECIFIC_IMAGE_ADMIN = async (req, res) => {
    if (!req.query.image_id) {
        return _throw400(res, 'image id required')
    }
    let image_list = null;
    try {
        image_list = await QuizImage.findById(req.query.image_id)
    } catch (error) {
        return _throw400Err(res, error)
    }
    if (!image_list) {
        return _throw400(res, 'no image found')
    }
    return res.status(200).send(image_list)
}

exports.DELETE_IMAGE_ADMIN = async (req, res) => {
    if (!req.query.image_id) {
        return _throw400(res, 'image id required')
    }
    let image_list = null;
    try {
        image_list = await QuizImage.findById(req.query.image_id)
    } catch (error) {
        return _throw400Err(res, error)
    }
    if (!image_list) {
        return _throw400(res, 'no image found')
    }
    let delete_image = null;
    try {
        delete_image = await QuizImage.findByIdAndDelete(req.query.image_id)
    } catch (error) {
        return _throw400Err(res, error)
    }
    if (!delete_image) {
        return _throw400(res, 'deletetion failed')
    }
    return res.status(200).send({ message: "image deleted successful", data: delete_image })
}

/**
 * admin api's
 */

exports.LOGIN_ADMIN = async function (req, res) {
    try {
        const admin_details = await AdminModel.findOne({ email: req.body.email }).lean()
        if (!admin_details) {
            return _throw400(res, 'no such user found')
        }
        let valid_password = await bcrypt.compare(req.body.password, admin_details.password);
        if (!valid_password) {
            return _throw400(res, 'wrong password')
        }

        const token = jwt.sign({ adminId: admin_details._id }, env.access_secretkey, {
            expiresIn: "3000m",
        });
        const { _id, email } = admin_details;

        res
            .status(200)
            .send({
                status: true,
                message: "logged in successfully",
                data: { token, _id, email },
            });

    } catch (err) {
        res.status(500).send({ status: false, message: err.message });
    }
}

/**Add subjective mark */

exports.UPDATE_SUBJECTIVE_MARKS = async (req, res) => {
    try {
        if (!req.query.quiz_id) {
            return _throw400(res, 'quiz id is required')
        }
        if (!req.query.quiz_submission_id) {
            return _throw400(res, 'quiz id is required')
        }
        let get_submission_data = await QuizSubmissions.findOne({
            "quiz_id": new mongoose.Types.ObjectId(req.query.quiz_id),
            "_id": new mongoose.Types.ObjectId(req.query.quiz_submission_id)
        });
        if (!get_submission_data) {
            return _throw404(res, 'no submission found')
        }
       let data=get_submission_data.result_overview
       data.subjective_mark_scored=req.body.total_subjective_mark
        await QuizSubmissions.findOneAndUpdate({ "_id": get_submission_data._id }, { result_overview: data,subjective_responses:req.body.subjective_response }, { new: true }).exec()
        return res.status(200).send("mark added successfully")
    } catch (err) {
        return _throw400Err(res, err)
    }

}

exports.GET_ONLY_TOTAL_MARKS_OF_USERS_ADMIN=async (req,res)=>{
    let pipeline = [
        {
            $match:{
                is_submitted:true
            }
        },
        {
            $sort: { createdAt: -1 }
        }
    ]
    let page = 1
    if (req.query.page) {
        page = parseInt(req.query.page)
    }

    let page_size = 10
    if (req.query.page_size) {
        page_size = parseInt(req.query.page_size)
    }

    if (req.query.quiz_id && req.query.quiz_id != "undefined") {
        pipeline.push({ $match: { quiz_id: new mongoose.Types.ObjectId(req.query.quiz_id) } })
    }
    
    if (req.query.sort == "mark") {
        pipeline.push({ $sort: { 'marks_scored': -1 } })
    }

    pipeline.push({
        $lookup: {
            from: "quiz",
            localField: "quiz_id",
            foreignField: "_id",
            as: "quiz"
        }
    })
    
    pipeline.push({
        $lookup: {
            from: "quiz-response",
            localField: "_id",
            foreignField: "submission_id",
            as: "responses"
        }
    })
    pipeline.push({
        $unwind: {
            path: "$responses",
            preserveNullAndEmptyArrays: true
        }
    });

    pipeline.push({
        $lookup: {
            from: "quiz-question-options",
            localField: "responses.answer",
            foreignField: "_id",
            as: "option"
        }
    });

    pipeline.push(
        {
            $group: {
                _id: "$_id",
                quiz_id: { $first: "$quiz_id" },
                objective_mark_scored: {
                    $sum: {
                        $cond: [
                            { $eq: [{ $arrayElemAt: ["$option.is_correct", 0] }, true] },
                            { $max: [0, { $arrayElemAt: ["$option.marks", 0] }] },
                            { $min: [0, { $arrayElemAt: ["$option.marks", 0] }] }
                        ]
                    }
                },

                submitted_time: { $first: "$submitted_time" },
                createdAt: { $first: "$createdAt" },
                updatedAt: { $first: "$updatedAt" },
                user: { $first: "$user" },
                result_overview: { $first: "$result_overview" }
            }
        }
    )
    pipeline.push(
    {
        $group: {
            _id: "$user.user_id",
            last_submission: { $last: "$$ROOT" }
        }
    },
    {
        $replaceRoot: { newRoot: "$last_submission" }
    },
    {
        $project: {
            'createdAt': 0,
            'updatedAt': 0
        }
    },
    {
        $addFields: {
            total_marks: {
                $add: ["$objective_mark_scored", "$result_overview.subjective_mark_scored"]
            }
        }
    }
    )
    pipeline.push({
        $facet: {
            "metadata": [{ "$count": "total_records" }],
            "records": [{ "$skip": (page - 1) * page_size }, { "$limit": page_size }],
        }
    })

    let submission_list = null;
    try {
        submission_list = await QuizSubmissions.aggregate(pipeline)
    } catch (err) {
        return _throw400Err(res, err)
    }
    if (!submission_list.length) {
        return _throw404(res, 'no submission found')
    }
    return res.status(200).send(submission_list)
}