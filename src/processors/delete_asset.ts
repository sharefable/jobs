// import {TMsgAttrs} from '../types';
// import {DeleteJobInfo} from '../api-contract';
// import { s3 } from '../singletons';
// import * as log from '../log';
// import { DeleteObjectCommand } from '@aws-sdk/client-s3';
// import { deepcopy, getS3FileLocationFromURI } from '../utils';

// type IProps = DeleteJobInfo & TMsgAttrs;
// export default async function(utProps: TMsgAttrs ) {
//   const props = utProps as IProps;
//   log.info('Received delete asset job', props.key);
//   const filePathArr = props.filePath.split(',');
//   const s3FileProps = getS3FileLocationFromURI(filePathArr[0]);
//   const deleteCommand = filePathArr.map(async (fileKey: any) => {
//     const key = getS3FileLocationFromURI(fileKey).fullFilePath;
//     const deleteObjectCommand = new DeleteObjectCommand({
//       Bucket: s3FileProps.bucketName,
//       Key: key,
//     });
//     try {
//       await s3.send(deleteObjectCommand);
//       log.info(`File deleted: ${fileKey}`);
//     } catch (err) {
//       log.err(`Error deleting file: ${fileKey}`, err);
//     }
//   });
//   await Promise.all(deleteCommand);
//   const updatedInfo: DeleteJobInfo = deepcopy<DeleteJobInfo>(props);
//   return updatedInfo;
// }
export {};
