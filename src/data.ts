import { Question } from "./types";
import { CHAPTER_1_QUESTIONS } from "./data/chapter1";
import { CHAPTER_2_QUESTIONS } from "./data/chapter2";

export const CHAPTERS = [
  { id: "chapter1", name: "Chapter 1: Foundations", questions: CHAPTER_1_QUESTIONS },
  { id: "chapter2", name: "Chapter 2: Vocabulary List #2", questions: CHAPTER_2_QUESTIONS }
];

export const INITIAL_QUESTIONS: Question[] = CHAPTER_1_QUESTIONS;
