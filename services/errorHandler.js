exports._throw400 = (response,errorMessage)=>{
    return response.status(400).send({detail:errorMessage})
}
exports._throw400Err = (response,err)=>{
    console.log(err)
    return response.status(400).json(err)
}
exports._throw401 = (response,errorMessage)=>{
    return response.status(401).send({detail:errorMessage})
}
exports._throw404 = (response,errorMessage)=>{
    return response.status(404).send({detail:errorMessage})
}
exports._throw422 = (response,errorMessage,error)=>{
    return response.status(422).send({detail:errorMessage,error:error.message})
}
exports._throw500 = (response,error)=>{
    console.log('--------------------- INTERNAL SERVER ERROR !! --------------------');
    console.log(error);
    return response.status(500).send({detail:'Internal server error', error:error})
}