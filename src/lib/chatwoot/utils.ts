export function cleanMessagePayload(payload: any) {
  const removeEmptyFields = (obj: { [x: string]: any; }) => {
    for (const key in obj) {
      if (obj[key] === null || 
          obj[key] === undefined || 
          (typeof obj[key] === 'object' && Object.keys(obj[key]).length === 0) ||
          obj[key] === 0 ||
          obj[key] === false) {
        delete obj[key];
      } else if (typeof obj[key] === 'object') {
        removeEmptyFields(obj[key]);
      }
    }
    return obj;
  };

  const cleanMessage = (message: any) => {
    // Remove redundant fields
    delete message.processed_message_content;
    delete message.external_source_ids;
    delete message.content_attributes;
    delete message.additional_attributes;
    delete message.sentiment;
    
    if (message.sender) {
      if (message.sender.thumbnail === message.sender.avatar_url) {
        delete message.sender.thumbnail;
      }
    }
    
    return removeEmptyFields(message);
  };

  const cleanedPayload = {...payload};
  
  // Clean main payload
  delete cleanedPayload.timestamp;
  delete cleanedPayload.waiting_since;
  delete cleanedPayload.last_non_activity_message;
  
  // Clean messages array
  if (cleanedPayload.messages) {
    cleanedPayload.messages = cleanedPayload.messages.map(cleanMessage);
  }
  
  return removeEmptyFields(cleanedPayload);
}